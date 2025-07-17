import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Outlet, Navigate } from 'react-router-dom';

export default function PrivateRoute() {
  const { isAuthenticated } = useContext(AuthContext);
  console.log('🔐 PrivateRoute auth:', isAuthenticated);
  return isAuthenticated 
    ? <Outlet /> 
    : <Navigate to="/login" replace />;
}
