import React from 'react';
import { LogOut } from 'lucide-react';

interface AdminSignOutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
}

export const AdminSignOutModal: React.FC<AdminSignOutModalProps> = ({
  visible,
  onClose,
  onConfirm,
  userName = 'Administrator',
}) => {
  if (!visible) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <div style={styles.iconCircle}>
          <LogOut size={28} color="#ff5252" />
        </div>
        <h3 style={styles.title}>Sign Out of Admin Console?</h3>
        <p style={styles.message}>
          You will end your administrative session as <strong>{userName}</strong>. You can securely log back in at any time.
        </p>

        <div style={styles.btnRow}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button style={styles.confirmBtn} onClick={onConfirm}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(2, 6, 17, 0.85)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    backgroundColor: '#0c192c',
    borderRadius: '20px',
    border: '1px solid rgba(255, 82, 82, 0.35)',
    padding: '28px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.85)',
    animation: 'fadeIn 0.2s ease-out',
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '32px',
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    border: '1.5px solid rgba(255, 82, 82, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#ffffff',
    textAlign: 'center',
    margin: '0 0 8px 0',
    letterSpacing: '0.3px',
  },
  message: {
    fontSize: '13px',
    color: '#90caf9',
    textAlign: 'center',
    lineHeight: 1.5,
    margin: '0 0 24px 0',
  },
  btnRow: {
    display: 'flex',
    width: '100%',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    height: '42px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#b0bec5',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  confirmBtn: {
    flex: 1,
    height: '42px',
    borderRadius: '10px',
    backgroundColor: '#ff5252',
    border: 'none',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 15px rgba(255, 82, 82, 0.4)',
    transition: 'all 0.2s ease',
  },
};
