import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import AppRouter from './router';
import ToastContainer from './components/UI/Toast';
import './index.css';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRouter />
        <ToastContainer />
      </BrowserRouter>
    </Provider>
  );
}
