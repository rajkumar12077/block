import React, { useState } from 'react';
import axios from '../api';
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Paper,
  Divider,
  IconButton,
  styled
} from '@mui/material';

import { Link as RouterLink } from 'react-router-dom';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

// Styled components for claymorphic design
const ClayContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: 16,
  backgroundColor: '#f0f0f3',
  boxShadow: `
    20px 20px 60px #ccccce,
    -20px -20px 60px #ffffff
  `,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
  }
}));

const ClayButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#f0f0f3',
  color: theme.palette.text.primary,
  padding: '12px 24px',
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  transition: 'all 0.3s ease-in-out',
  boxShadow: `
    6px 6px 12px #ccccce,
    -6px -6px 12px #ffffff
  `,
  '&.login-button': {
    '&:hover': {
      backgroundColor: '#2e7d32',
      color: '#ffffff',
      boxShadow: `
        0 0 10px #4caf50,
        0 0 20px #4caf50,
        0 0 30px #81c784,
        inset 0 0 10px rgba(129, 199, 132, 0.5)
      `,
      transform: 'translateY(-2px)',
      '&:before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 12,
        background: 'linear-gradient(45deg, #2e7d32, #81c784)',
        opacity: 0.2,
        transition: 'opacity 0.3s ease-in-out',
      }
    }
  },
  '&:hover': {
    backgroundColor: '#e8e8eb',
    boxShadow: `
      4px 4px 8px #ccccce,
      -4px -4px 8px #ffffff
    `
  }
}));

const SocialButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: '#f0f0f3',
  width: 50,
  height: 50,
  margin: theme.spacing(1),
  boxShadow: `
    6px 6px 12px #ccccce,
    -6px -6px 12px #ffffff
  `,
  '&:hover': {
    backgroundColor: '#e8e8eb',
  }
}));

const ClayTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#f0f0f3',
    borderRadius: 12,
    boxShadow: 'inset 2px 2px 5px #ccccce, inset -2px -2px 5px #ffffff',
    '& fieldset': {
      borderColor: 'transparent',
    },
    '&:hover fieldset': {
      borderColor: 'transparent',
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    }
  }
}));

const GoogleButton = styled(SocialButton)({
  position: 'relative',
  overflow: 'hidden',
  '& .MuiSvgIcon-root': {
    fontSize: '28px',
    color: '#DB4437', // Google red color
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
});

const Login: React.FC<{ onLogin: (token: string, role: string) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer <= 1) {
            setCanResend(true);
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const startResendTimer = () => {
    setTimer(30); // 30 seconds countdown
    setCanResend(false);
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post('/auth/login', { email, password });
      console.log('Login response:', response.data);
      setStep('otp');
      startResendTimer();
    } catch (error: any) {
      console.error('Login error:', error.response?.data);
      setError(error.response?.data?.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post('/auth/verify-otp', { email, otp });
      onLogin(res.data.token, res.data.role);
    } catch (error: any) {
      console.error('OTP verification error:', error.response?.data);
      setError(error.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.post('/auth/resend-otp', { email });
      startResendTimer();
    } catch (error: any) {
      console.error('Resend OTP error:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      maxWidth: 400, 
      mx: 'auto', 
      mt: 8,
      px: 2
    }}>
      <ClayContainer>
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 4, 
            textAlign: 'center',
            fontWeight: 700,
            color: '#2e7d32'
          }}
        >
          Welcome Back
        </Typography>

        {step === 'login' ? (
          <>

            <ClayTextField
              label="Email"
              fullWidth
              margin="normal"
              value={email}
              onChange={e => setEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <ClayTextField
              label="Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              margin="normal"
              value={password}
              onChange={e => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                ),
              }}
            />



            <ClayButton
              fullWidth
              onClick={handleLogin}
              className="login-button"
              disabled={loading}
              sx={{ 
                mb: 2,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </ClayButton>
            {error && (
              <Typography color="error" sx={{ mt: 2, textAlign: 'center' }}>
                {error}
              </Typography>
            )}

            <Typography 
              variant="body2" 
              align="center" 
              sx={{ mt: 2 }}
            >
              Don't have an account?{' '}
              <RouterLink 
                to="/signup" 
                style={{ 
                  color: '#2e7d32',
                  textDecoration: 'none',
                  fontWeight: 600
                }}
              >
                Sign up
              </RouterLink>
            </Typography>

            <Divider sx={{ my: 3 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  px: 2
                }}
              >
                or login with
              </Typography>
            </Divider>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <a 
                href="https://accounts.google.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <GoogleButton>
                  <GoogleIcon />
                </GoogleButton>
              </a>
              <a 
                href="https://www.facebook.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <SocialButton>
                  <FacebookIcon sx={{ 
                    color: '#1877f2',
                    fontSize: '28px'
                  }} />
                </SocialButton>
              </a>
              <a 
                href="https://twitter.com/i/flow/signup"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <SocialButton>
                  <TwitterIcon sx={{ 
                    color: '#1da1f2',
                    fontSize: '28px'
                  }} />
                </SocialButton>
              </a>
            </Box>
          </>
        ) : (
          <>
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 2, 
                textAlign: 'center',
                color: 'text.secondary'
              }}
            >
              Enter the OTP sent to your email
            </Typography>

            <ClayTextField
              label="OTP"
              fullWidth
              margin="normal"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              sx={{ mb: 3 }}
            />
            
            <ClayButton
              fullWidth
              onClick={handleVerifyOtp}
              disabled={loading}
              className="login-button"
              sx={{ mb: 2 }}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </ClayButton>

            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
              {timer > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Resend OTP in {timer}s
                </Typography>
              ) : (
                <ClayButton
                  onClick={handleResendOtp}
                  disabled={loading || !canResend}
                  sx={{ 
                    minWidth: 'auto',
                    fontSize: '0.875rem'
                  }}
                >
                  Resend OTP
                </ClayButton>
              )}
            </Box>

            {error && (
              <Typography color="error" sx={{ mt: 2, textAlign: 'center' }}>
                {error}
              </Typography>
            )}
          </>
        )}
      </ClayContainer>
    </Box>
  );
};

export default Login;