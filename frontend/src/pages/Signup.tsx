import React, { useState } from 'react';
import axios from '../api';
import { TextField, Button, Typography, Box, MenuItem, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const roles = [
  'buyer',
  'seller',
  'insurance',
  'logistics',
  'coldstorage',
  'driver',
];

interface SignupProps {
  onSignup: (userData: any) => Promise<{ success: boolean; message: any }>;
}

const Signup: React.FC<SignupProps> = ({ onSignup }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'signup' | 'otp'>('signup');
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

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

  const handleSignup = async () => {
    setError('');
    setLoading(true);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      const result = await onSignup({ name, email, phone, address, password, role });
      if (result.success) {
        setStep('otp');
        startResendTimer();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/auth/verify-otp', { email, otp });
      if (res.data && res.data.token) {
        window.location.href = '/';
      } else {
        setError('OTP verification failed');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendOtp = async () => {
    try {
      setLoading(true);
      setError('');
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
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h5">Signup</Typography>
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      {step === 'signup' ? (
        <>
          <TextField label="Name" fullWidth margin="normal" value={name} onChange={e => setName(e.target.value)} />
          <TextField label="Email" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} />
          <TextField label="Phone Number" fullWidth margin="normal" value={phone} onChange={e => setPhone(e.target.value)} />
          <TextField label="Address" fullWidth margin="normal" value={address} onChange={e => setAddress(e.target.value)} />
          <TextField 
            label="Password" 
            type={showPassword ? "text" : "password"} 
            fullWidth 
            margin="normal" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
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
          <TextField 
            label="Confirm Password" 
            type={showConfirmPassword ? "text" : "password"} 
            fullWidth 
            margin="normal" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              ),
            }}
          />
          <TextField select label="Role" fullWidth margin="normal" value={role} onChange={e => setRole(e.target.value)}>
            {roles.map(r => (
              <MenuItem key={r} value={r}>{r}</MenuItem>
            ))}
          </TextField>
          <Button variant="contained" color="primary" fullWidth onClick={handleSignup}>Send OTP</Button>
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
          <TextField label="OTP" fullWidth margin="normal" value={otp} onChange={e => setOtp(e.target.value)} />
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth 
            onClick={handleVerifyOtp}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </Button>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 1 }}>
            {timer > 0 ? (
              <Typography variant="body2" color="text.secondary">
                Resend OTP in {timer}s
              </Typography>
            ) : (
              <Button
                variant="outlined"
                onClick={handleResendOtp}
                disabled={loading || !canResend}
                sx={{ 
                  minWidth: 'auto',
                  fontSize: '0.875rem'
                }}
              >
                Resend OTP
              </Button>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default Signup;
