import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthDialog from "../components/AuthDialog";

const AuthDialogContext = createContext(null);

export function AuthDialogProvider({ children }) {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null); // { mode, returnTo } while open
  const openerRef = useRef(null);
  const restoreFocusRef = useRef(false);

  const openAuthDialog = useCallback((mode = "login", { returnTo } = {}) => {
    openerRef.current = document.activeElement;
    setDialog({ mode, returnTo });
  }, []);

  const close = useCallback(() => {
    restoreFocusRef.current = true;
    setDialog(null);
  }, []);

  const handleAuthenticated = useCallback(() => {
    const returnTo = dialog?.returnTo;
    close();
    if (returnTo) navigate(returnTo);
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
