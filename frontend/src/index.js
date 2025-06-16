"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
require("./index.css");
const App_1 = __importDefault(require("./App"));
const reportWebVitals_1 = __importDefault(require("./reportWebVitals"));
const root = client_1.default.createRoot(document.getElementById('root'));
root.render(<react_1.default.StrictMode>
    <App_1.default />
  </react_1.default.StrictMode>);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
(0, reportWebVitals_1.default)();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxrREFBMEI7QUFDMUIsOERBQXdDO0FBQ3hDLHVCQUFxQjtBQUNyQixnREFBd0I7QUFDeEIsd0VBQWdEO0FBRWhELE1BQU0sSUFBSSxHQUFHLGdCQUFRLENBQUMsVUFBVSxDQUM5QixRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBZ0IsQ0FDL0MsQ0FBQztBQUNGLElBQUksQ0FBQyxNQUFNLENBQ1QsQ0FBQyxlQUFLLENBQUMsVUFBVSxDQUNmO0lBQUEsQ0FBQyxhQUFHLENBQUMsQUFBRCxFQUNOO0VBQUEsRUFBRSxlQUFLLENBQUMsVUFBVSxDQUFDLENBQ3BCLENBQUM7QUFFRiwwRUFBMEU7QUFDMUUsNkRBQTZEO0FBQzdELDBFQUEwRTtBQUMxRSxJQUFBLHlCQUFlLEdBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgUmVhY3RET00gZnJvbSAncmVhY3QtZG9tL2NsaWVudCc7XG5pbXBvcnQgJy4vaW5kZXguY3NzJztcbmltcG9ydCBBcHAgZnJvbSAnLi9BcHAnO1xuaW1wb3J0IHJlcG9ydFdlYlZpdGFscyBmcm9tICcuL3JlcG9ydFdlYlZpdGFscyc7XG5cbmNvbnN0IHJvb3QgPSBSZWFjdERPTS5jcmVhdGVSb290KFxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpIGFzIEhUTUxFbGVtZW50XG4pO1xucm9vdC5yZW5kZXIoXG4gIDxSZWFjdC5TdHJpY3RNb2RlPlxuICAgIDxBcHAgLz5cbiAgPC9SZWFjdC5TdHJpY3RNb2RlPlxuKTtcblxuLy8gSWYgeW91IHdhbnQgdG8gc3RhcnQgbWVhc3VyaW5nIHBlcmZvcm1hbmNlIGluIHlvdXIgYXBwLCBwYXNzIGEgZnVuY3Rpb25cbi8vIHRvIGxvZyByZXN1bHRzIChmb3IgZXhhbXBsZTogcmVwb3J0V2ViVml0YWxzKGNvbnNvbGUubG9nKSlcbi8vIG9yIHNlbmQgdG8gYW4gYW5hbHl0aWNzIGVuZHBvaW50LiBMZWFybiBtb3JlOiBodHRwczovL2JpdC5seS9DUkEtdml0YWxzXG5yZXBvcnRXZWJWaXRhbHMoKTtcbiJdfQ==