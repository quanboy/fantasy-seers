import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthDialog from "../components/AuthDialog";
import { useAuth } from "./AuthContext";

const AuthDialogContext = createContext(null);

export function AuthDialogProvider({ children }) {
  const navigate = useNavigate();
  const { cancelPendingAuth } = useAuth();
  const [dialog, setDialog] = useState(null); // { mode, returnTo, onAuthenticated } while open
  const openerRef = useRef(null);
  const restoreFocusRef = useRef(false);
  const activeDialogRef = useRef(null);
  const nextDialogIdRef = useRef(0);

  // onAuthenticated resumes whatever asked for login (e.g. saving rankings); it runs
  // once after a successful login/signup and is dropped if the dialog is dismissed.
  const openAuthDialog = useCallback((mode = "login", { returnTo, onAuthenticated } = {}) => {
    cancelPendingAuth();
    openerRef.current = document.activeElement;
    const nextDialog = { id: ++nextDialogIdRef.current, mode, returnTo, onAuthenticated };
    activeDialogRef.current = nextDialog;
    setDialog(nextDialog);
  }, [cancelPendingAuth]);

  const close = useCallback(() => {
    cancelPendingAuth();
    activeDialogRef.current = null;
    restoreFocusRef.current = true;
    setDialog(null);
  }, [cancelPendingAuth]);

  const handleAuthenticated = useCallback((dialogId, authenticatedUser) => {
    const activeDialog = activeDialogRef.current;
    if (!activeDialog || activeDialog.id !== dialogId) return;
    const { returnTo, onAuthenticated } = activeDialog;
    close();
    if (returnTo) navigate(returnTo);
    onAuthenticated?.(authenticatedUser);
  }, [close, navigate]);

  const changeMode = useCallback((mode) => {
    cancelPendingAuth();
    setDialog((current) => {
      if (!current) return current;
      const nextDialog = { ...current, mode };
      activeDialogRef.current = nextDialog;
      return nextDialog;
    });
  }, [cancelPendingAuth]);

  // Return focus to whatever opened the dialog, if it is still on the page.
  useEffect(() => {
    if (dialog || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) {
      opener.focus();
    } else {
      document.querySelector("[data-auth-focus-fallback]")?.focus();
    }
  }, [dialog]);

  const value = useMemo(() => ({ openAuthDialog }), [openAuthDialog]);

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      {dialog && (
        <AuthDialog
          key={dialog.id}
          mode={dialog.mode}
          onModeChange={changeMode}
          onClose={close}
          onAuthenticated={(authenticatedUser) => handleAuthenticated(dialog.id, authenticatedUser)}
        />
      )}
    </AuthDialogContext.Provider>
  );
}

export const useAuthDialog = () => useContext(AuthDialogContext);
