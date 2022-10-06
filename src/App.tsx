import { FormEvent, useState } from 'react';
import { useAuth } from './hooks/useAuth';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isAuthtenticated, user } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const data = {
      email,
      password,
    };
    await signIn(data);
  }

  return (
    <div className='App'>
      <form
        onSubmit={e => handleSubmit(e)}
        className={'form'}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <input
          placeholder='login'
          className='login'
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          placeholder='password'
          type={'password'}
          className='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button type='submit'>Login</button>
      </form>

      {isAuthtenticated ? (
        <h1>
          Hello, usuário: {user?.email} / {user?.permissions}
        </h1>
      ) : (
        <h1>Não tem nenhum usuário</h1>
      )}
    </div>
  );
}

export default App;
