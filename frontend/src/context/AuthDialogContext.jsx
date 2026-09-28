import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthDialog from "../components/AuthDialog";

const AuthDialogContext = createContext(null);

export function AuthDialogProvider({ children }) {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null); // { mode, returnTo, onAuthenticated } while open
  const openerRef = useRef(null);
  const restoreFocusRef = useRef(false);

  // onAuthenticated resumes whatever asked for login (e.g. saving rankings); it runs
  // once after a successful login/signup and is dropped if the dialog is dismissed.
  const openAuthDialog = useCallback((mode = "login", { returnTo, onAuthenticated } = {}) => {
    openerRef.current = document.activeElement;
    setDialog({ mode, returnTo, onAuthenticated });
  }, []);

  const close = useCallback(() => {
    restoreFocusRef.current = true;
    setDialog(null);
  }, []);

  const handleAuthenticated = useCallback(() => {
    const returnTo = dialog?.returnTo;
    const onAuthenticated = dialog?.onAuthenticated;
    close();
    if (returnTo) navigate(returnTo);
    onAuthenticated?.();
  }, [dialog, close, navigate]);

  // Return focus to whatever opened the dialog, if it is still on the page.
  useEffect(() => {
    if (dialog || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) opener.focus();
  }, [dialog]);

  const value = useMemo(() => ({ openAuthDialog }), [openAuthDialog]);

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      {dialog && (
        <AuthDialog
          mode={dialog.mode}
          onModeChange={(mode) => setDialog((current) => ({ ...current, mode }))}
          onClose={close}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </AuthDialogContext.Provider>
  );
}

export const useAuthDialog = () => useContext(AuthDialogContext);
