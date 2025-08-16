import { toast, ToastOptions } from 'react-toastify';

// Default toast configuration
const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

// Success toast
export const showSuccessToast = (message: string, options?: ToastOptions) => {
  return toast.success(message, { ...defaultOptions, ...options });
};

// Error toast
export const showErrorToast = (message: string, options?: ToastOptions) => {
  return toast.error(message, { ...defaultOptions, ...options });
};

// Info toast
export const showInfoToast = (message: string, options?: ToastOptions) => {
  return toast.info(message, { ...defaultOptions, ...options });
};

// Warning toast
export const showWarningToast = (message: string, options?: ToastOptions) => {
  return toast.warning(message, { ...defaultOptions, ...options });
};

// Handle error and show toast
export const handleErrorWithToast = (error: any) => {
  const errorMessage = error?.message || 'An unexpected error occurred';
  showErrorToast(errorMessage);
  console.error(error);
  return error;
};
