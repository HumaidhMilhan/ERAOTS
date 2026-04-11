/**
 * Auth Context — manages login state across the app.
 */
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY = ['EMPLOYEE', 'MANAGER', 'HR_MANAGER', 'SUPER_ADMIN'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('eraots_token');
    if (token) {
      authAPI.getMe()
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('eraots_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    const { access_token, role, employee_name, user_id } = res.data;
    localStorage.setItem('eraots_token', access_token);
    
    // Fetch full user info
    const meRes = await authAPI.getMe();
    setUser(meRes.data);
    return meRes.data;
  };

  const logout = () => {
    localStorage.removeItem('eraots_token');
    setUser(null);
  };

  const refreshUser = async () => {
    const meRes = await authAPI.getMe();
    setUser(meRes.data);
    return meRes.data;
  };

  // Role helper functions
  const roleHelpers = useMemo(() => {
    const role = user?.role || 'EMPLOYEE';
    const roleIndex = ROLE_HIERARCHY.indexOf(role);
    
    return {
      // Check if user has exact role
      hasRole: (roleName) => user?.role === roleName,
      
      // Check if user has at least this role level
      hasMinRole: (minRole) => {
        const minIndex = ROLE_HIERARCHY.indexOf(minRole);
        return roleIndex >= minIndex;
      },
      
      // Quick role checks
      isEmployee: role === 'EMPLOYEE',
      isManager: role === 'MANAGER' || user?.is_manager,
      isHR: role === 'HR_MANAGER',
      isSuperAdmin: role === 'SUPER_ADMIN',
      isAdmin: roleIndex >= ROLE_HIERARCHY.indexOf('HR_MANAGER'), // HR or higher
      
      // Check specific permission
      hasPermission: (permission) => {
        const perms = user?.permissions || {};
        return perms.all === true || perms[permission] === true;
      },
      
      // Get managed department (for managers)
      getManagedDepartmentId: () => user?.managed_department_id,
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      refreshUser,
      ...roleHelpers 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
