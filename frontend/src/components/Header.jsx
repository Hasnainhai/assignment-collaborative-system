import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Badge,
  Avatar,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  ExitToApp,
  Description,
  History,
  Add,
  Dashboard,
  Notifications,
  Settings,
  Person,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = React.useState(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = React.useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = React.useState(null);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMobileMenuAnchorEl(null);
    setNotificationsAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.username) {
      return user.username[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const menuItems = [
    { text: 'Documents', path: '/documents', icon: <Description /> },
    { text: 'Create New', path: '/create', icon: <Add />, variant: 'contained' },
  ];

  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      PaperProps={{
        elevation: 3,
        sx: {
          width: 220,
          borderRadius: 2,
          mt: 1.5,
          overflow: 'visible',
          '&:before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            top: 0,
            right: 14,
            width: 10,
            height: 10,
            bgcolor: 'background.paper',
            transform: 'translateY(-50%) rotate(45deg)',
            zIndex: 0,
          }
        },
      }}
    >
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {user?.firstName} {user?.lastName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.email}
        </Typography>
      </Box>
      <Divider />
      <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
        <ListItemIcon>
          <Person fontSize="small" />
        </ListItemIcon>
        <ListItemText>Profile</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => { navigate('/settings'); handleMenuClose(); }}>
        <ListItemIcon>
          <Settings fontSize="small" />
        </ListItemIcon>
        <ListItemText>Settings</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <ExitToApp fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText sx={{ color: 'error.main' }}>Logout</ListItemText>
      </MenuItem>
    </Menu>
  );

  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMenuAnchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={Boolean(mobileMenuAnchorEl)}
      onClose={handleMenuClose}
      PaperProps={{
        sx: {
          width: 280,
          borderRadius: 2,
        },
      }}
    >
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {user?.firstName} {user?.lastName}
        </Typography>
        <Typography variant="body2">
          {user?.email}
        </Typography>
      </Box>
      {menuItems.map((item) => (
        <MenuItem
          key={item.path}
          onClick={() => {
            navigate(item.path);
            handleMenuClose();
          }}
          selected={isActiveRoute(item.path)}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            {item.icon}
          </ListItemIcon>
          <ListItemText primary={item.text} />
        </MenuItem>
      ))}
      <Divider />
      <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
        <ListItemIcon>
          <Person fontSize="small" />
        </ListItemIcon>
        <ListItemText>Profile</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <ExitToApp fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText sx={{ color: 'error.main' }}>Logout</ListItemText>
      </MenuItem>
    </Menu>
  );

  const renderNotificationsMenu = (
    <Menu
      anchorEl={notificationsAnchorEl}
      open={Boolean(notificationsAnchorEl)}
      onClose={handleMenuClose}
      PaperProps={{
        sx: {
          width: 320,
          maxHeight: 400,
          borderRadius: 2,
        },
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Notifications
        </Typography>
      </Box>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No new notifications
        </Typography>
      </Box>
    </Menu>
  );

  return (
    <AppBar 
      position="sticky" 
      color="default" 
      elevation={0}
      sx={{
        backgroundColor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(10px)',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
      }}
    >
      <Toolbar sx={{ minHeight: 70 }}>
        {/* Logo */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            flexGrow: { xs: 1, md: 0 },
          }}
          onClick={() => navigate('/documents')}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Description sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            CollabEdit
          </Typography>
        </Box>

        {/* Desktop Navigation */}
        {user && !isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 4, flexGrow: 1 }}>
            {menuItems.map((item) => (
              <Button
                key={item.path}
                variant={item.variant || 'text'}
                color={isActiveRoute(item.path) ? 'primary' : 'inherit'}
                onClick={() => navigate(item.path)}
                startIcon={item.icon}
                sx={{
                  textTransform: 'none',
                  fontWeight: isActiveRoute(item.path) ? 600 : 400,
                  borderRadius: 2,
                  px: 2,
                  ...(item.variant === 'contained' && {
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 2px 5px rgba(16, 185, 129, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      boxShadow: '0 4px 8px rgba(16, 185, 129, 0.4)',
                    }
                  })
                }}
              >
                {item.text}
              </Button>
            ))}
          </Box>
        )}

        {/* Right side actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          {user ? (
            <>
              {/* Notifications - Desktop only */}
              {!isMobile && (
                <IconButton
                  size="medium"
                  onClick={handleNotificationsOpen}
                  sx={{
                    backgroundColor: 'grey.50',
                    '&:hover': { backgroundColor: 'grey.100' },
                  }}
                >
                  <Badge badgeContent={0} color="error">
                    <Notifications fontSize="small" />
                  </Badge>
                </IconButton>
              )}

              {/* User profile */}
              {!isMobile && (
                <Chip
                  avatar={
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      {getUserInitials()}
                    </Avatar>
                  }
                  label={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Typography variant="caption" fontWeight={600}>
                        {user?.firstName || user?.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user?.email?.split('@')[0]}
                      </Typography>
                    </Box>
                  }
                  onClick={handleProfileMenuOpen}
                  sx={{
                    height: 48,
                    padding: 0.5,
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'white',
                    '&:hover': {
                      backgroundColor: 'grey.50',
                    },
                  }}
                />
              )}

              {/* Mobile menu button */}
              {isMobile && (
                <IconButton
                  size="large"
                  onClick={handleMobileMenuOpen}
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  }}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  fontWeight: 600,
                  borderColor: 'divider',
                }}
              >
                Login
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/register')}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  boxShadow: '0 2px 5px rgba(59, 130, 246, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                    boxShadow: '0 4px 8px rgba(59, 130, 246, 0.4)',
                  }
                }}
              >
                Get Started
              </Button>
            </Box>
          )}
        </Box>
      </Toolbar>

      {renderMenu}
      {renderMobileMenu}
      {renderNotificationsMenu}
    </AppBar>
  );
};

export default Header;