// SHIRLEY DING, 100% contribution
import { Outlet } from 'react-router-dom';
import useRequireAuth from '../hooks/useRequireAuth';
import useRequirePageVariant from '../hooks/useRequirePageVariant';
import { resolvePath } from '../auth/authUtils';

function ShellLoading() {
  return (
    <div className="dash-root" style={{ padding: 24 }}>
      <p>Loading…</p>
    </div>
  );
}

/* variant: student or professor */
function VariantBranch({ variant }) {
  const { user, userId, loading } = useRequirePageVariant({
    variant,
    canonicalPath: (u) => resolvePath('dashboard', u),
  });

  if (loading || user == null || userId == null) {
    return <ShellLoading />;
  }

  return <Outlet context={{ user, userId }} />;
}

function LoginOnlyBranch() {
  const { user, userId, loading } = useRequireAuth();

  if (loading || user == null || userId == null) {
    return <ShellLoading />;
  }

  return <Outlet context={{ user, userId }} />;
}

/* One shell for all authenticated routes */
export default function AppShellLayout({ variant }) {
  if (variant === 'any') {
    return <LoginOnlyBranch />;
  }
  return <VariantBranch variant={variant} />;
}
