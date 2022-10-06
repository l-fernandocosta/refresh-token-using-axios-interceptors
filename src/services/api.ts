import axios, { Axios, AxiosError } from 'axios';
import { parseCookies, setCookie } from 'nookies';
import { signOut } from '../Contexts/AuthContext';

interface IFailedRequestsQueu {
  onSuccess: (token: string) => void;
  onFailure: (error: AxiosError) => void;
}

let cookies = parseCookies();
let isRefreshing = false; //Check if the token is updating
let failedRequestsQueue: IFailedRequestsQueu[] = []; //All failed request by expired token -
// we put all the requests inside the queue waiting the refresh token, after this we retry the
// requests

const api = axios.create({
  baseURL: 'http://localhost:3333/',
  headers: {
    Authorization: `Bearer ${cookies['nextauth.token']}`,
  },
});

api.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      //@ts-ignore
      if (error.response.data.code === 'token.expired') {
        const cookies = parseCookies();
        const {
          'nextauth.refreshToken': refreshToken,
          'nextauth.token': tokenteste,
        } = cookies;
        console.log('TOKEN ATUAL', tokenteste);

        //All configuration to retry a request to the backend (route / parameters / callback function)
        // its inside this const
        const originalConfig = error.config;
        if (!isRefreshing) {
          isRefreshing = true;

          api
            .post('refresh', {
              refreshToken,
            })
            .then(response => {
              const { token } = response?.data;
              console.log('TOKEN DEPOIS DO REFRESH TOKEN', response.data.token);
              setCookie(undefined, 'nextauth.token', token);

              setCookie(
                undefined,
                'nextauth.refreshToken',
                response?.data?.refreshToken
              );

              api.defaults.headers['Authorization'] = `Bearer ${token}`;

              failedRequestsQueue.forEach((request, index, array) => {
                request.onSuccess(token);
              });
              failedRequestsQueue = [];
            })
            .catch(error => {
              failedRequestsQueue.forEach(request => request.onFailure(error));
              failedRequestsQueue = [];
            })
            .finally(() => {
              isRefreshing = false;
            });
        }

        return new Promise(async (resolve, reject) => {
          failedRequestsQueue.push({
            onSuccess: (token: string) => {
              if (originalConfig?.headers)
                originalConfig.headers['Authorization'] = `Bearer ${token}`;
              //retry the failed requests
              resolve(
                api(`${originalConfig?.url}`, {
                  method: originalConfig?.method,
                  data: originalConfig?.data,
                })
              );
            },
            onFailure: (error: AxiosError) => {
              reject(error);
            },
          });
        });
      } else {
        //disconnect user
        signOut();
      }
    }
    // if all the cases upside doesnt work
    return Promise.reject(error);
  }
);
export { api };
