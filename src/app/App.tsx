import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes';

/** Root React component. */
export default function App() {
  return <RouterProvider router={router} />;
}