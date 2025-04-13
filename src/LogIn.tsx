import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './LogIn.css'
import { useNavigate } from 'react-router-dom';

export default function LogIn() {
  const navigate = useNavigate();

  return (
    <ThemeProvider>
      <div className="login-container">
        <Authenticator>
          {({ user }) => {
            if (user) {
              navigate("/all");
            }

            return (
              <div>
                <h1>Welcome, {user?.username}!</h1>
              </div>
            );
          }}
        </Authenticator>
      </div>
    </ThemeProvider>
  );
}
