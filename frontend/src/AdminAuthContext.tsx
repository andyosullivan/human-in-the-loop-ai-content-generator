// AdminAuthContext.tsx
import React, { createContext, useContext, useState } from "react";
import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
} from "amazon-cognito-identity-js";

const POOL_DATA = {
    UserPoolId: "eu-west-1_cqy9AtskX",
    ClientId: "2rl72ndj8cvcjrs14kqq66vvoh"
};

const userPool = new CognitoUserPool(POOL_DATA);

type AuthContextType = {
    jwt: string | null;
    login: (email: string, password: string, newPassword?: string) => Promise<void>;
    logout: () => void;
    user: CognitoUser | null;
};

const AdminAuthContext = createContext<AuthContextType>({
    jwt: null,
    login: async () => {},
    logout: () => {},
    user: null,
});

export function useAuth() {
    return useContext(AdminAuthContext);
}

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [jwt, setJwt] = useState<string | null>(null);
    const [user, setUser] = useState<CognitoUser | null>(null);

    const login = (email: string, password: string, newPassword?: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const cognitoUser = new CognitoUser({
                Username: email,
                Pool: userPool,
            });
            const authDetails = new AuthenticationDetails({
                Username: email,
                Password: password,
            });

            cognitoUser.authenticateUser(authDetails, {
                onSuccess: (result) => {
                    setUser(cognitoUser);
                    setJwt(result.getIdToken().getJwtToken());
                    resolve();
                },
                onFailure: (err) => {
                    reject(err);
                },
                    newPasswordRequired: (userAttributes, requiredAttributes) => {
                        if (!newPassword) {
                            reject({ code: "NEW_PASSWORD_REQUIRED" });
                            return;
                        }
                        // Remove non-mutable attributes
                        const filteredAttrs = { ...userAttributes };
                        delete filteredAttrs.email_verified;
                        delete filteredAttrs.phone_number_verified;
                        cognitoUser.completeNewPasswordChallenge(
                            newPassword,
                            {}, // Don't pass any attributes unless required
                            {
                                onSuccess: (result) => {
                                    setUser(cognitoUser);
                                    setJwt(result.getIdToken().getJwtToken());
                                    resolve();
                                },
                                onFailure: (err) => {
                                    reject(err);
                                },
                            }
                        );

                    },
            });
        });
    };

    const logout = () => {
        if (user) {
            user.signOut();
        }
        setUser(null);
        setJwt(null);
    };

    return (
        <AdminAuthContext.Provider value={{ jwt, login, logout, user }}>
            {children}
        </AdminAuthContext.Provider>
    );
};
