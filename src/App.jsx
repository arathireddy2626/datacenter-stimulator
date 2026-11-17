import { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './portal/store';
import { Top } from './portal/ui';
import Login from './portal/Login';
import ChangePassword from './portal/ChangePassword';
import Admin from './portal/Admin';
import Instructor from './portal/Instructor';
import Student from './portal/Student';
import Viewer from './portal/Viewer';

const PAGES = { admin: Admin, instructor: Instructor, student: Student, viewer: Viewer };

function Shell() {
  const [state, dispatch] = useStore();
  const [userId, setUserId] = useState(() => sessionStorage.getItem('equnix-session'));
  const [theme, setTheme] = useState(() => localStorage.getItem('equnix-theme') || 'dark');
  const user = state.users.find((u) => u.id === userId && u.active);

  useEffect(() => {
    localStorage.setItem('equnix-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const signIn = (id) => {
    sessionStorage.setItem('equnix-session', id);
    dispatch({ t: 'log', uid: id, type: 'login', detail: 'Signed in' });
    setUserId(id);
  };
  const signOut = () => {
    if (user) dispatch({ t: 'log', uid: user.id, type: 'logout', detail: 'Signed out' });
    sessionStorage.removeItem('equnix-session');
    setUserId(null);
  };

  const Page = user && PAGES[user.role];
  let content;
  if (!user) content = <Login onLogin={signIn} theme={theme} onToggle={toggleTheme} />;
  else if (user.mustChange) content = <ChangePassword user={user} onOut={signOut} />;
  else {
    content = (
      <div className="pt">
        <Top user={user} onOut={signOut} theme={theme} onToggle={toggleTheme} />
        <Page user={user} />
      </div>
    );
  }
  return (
    <div className="pt-root" data-theme={theme}>
      {content}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
