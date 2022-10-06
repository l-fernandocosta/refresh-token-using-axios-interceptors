import { createContext, ReactNode, useEffect, useState } from 'react';
import { destroyCookie, parseCookies, setCookie } from 'nookies';
import { api } from '../services/api';

interface IUser {
  email: string;
  roles: string[];
  permissions: string[];
}

interface IAuthProvider {
  children: ReactNode;
}

interface ISigninCredentials {
  email: string;
  password: string;
}

interface IAuthContextData {
  signIn(credentials: ISigninCredentials): Promise<void>;
  isAuthtenticated: boolean;
  user: IUser | undefined;
}

const AuthContext = createContext({} as IAuthContextData);

let authChannel: BroadcastChannel;

export function signOut() {
  destroyCookie(undefined, 'nextauth.token');
  destroyCookie(undefined, 'nextauth.refreshToken');
  authChannel.postMessage('signOut');
  // redirect user to / path
}

export function AuthProvider({ children }: IAuthProvider) {
  const [user, setUser] = useState<IUser>();
  let isAuthtenticated = !!user;

  useEffect(() => {
    authChannel.postMessage('auth');
    authChannel.onmessage = (message: any) => {
      switch (message.data) {
        case 'signOut':
          signOut();
          break;
        default:
          break;
      }
    };
  }, []);

  useEffect(() => {
    const { 'nextauth.token': token } = parseCookies();
    if (token) {
      api.get('me').then(response => {
        if (response.data) {
          const { email, permissions, roles } = response?.data;

          setUser({
            email,
            permissions,
            roles,
          });
        }
      });
    }
  }, []);

  async function signIn(credentials: ISigninCredentials) {
    try {
      const response = await api.post('sessions', {
        email: credentials.email,
        password: credentials.password,
      });

      const { permissions, roles, token, refreshToken } = response.data;
      setUser({ email: credentials.email, permissions, roles });

      setCookie(undefined, 'nextauth.token', token, {
        maxAge: 60 * 60 * 24 * 30, // 30 DAYS
        path: '/', //Which paths can access this cookie
      });

      setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
        maxAge: 60 * 60 * 24 * 30, // 30 DAYS
        path: '/', //Which paths can access this cookie
      });

      api.defaults.headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.log(error);
    }
  }
  return (
    <AuthContext.Provider value={{ isAuthtenticated, signIn, user }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
