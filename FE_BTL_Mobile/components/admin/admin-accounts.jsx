import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useAuthSession } from '@/components/auth-session';
import { apiFetch } from '@/lib/api';
import { login } from '@/lib/auth-api';
import './admin.css';

const formatDate = (value) => value && !Number.isNaN(new Date(value).getTime())
  ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa cập nhật';
const displayName = (user) => user.ho_ten || user.ten_dang_nhap;
const initials = (user) => displayName(user).trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase();
const Icon = ({ name, size = 20 }) => <span aria-hidden="true" className="adm-icon"><Ionicons name={name} size={size} color="currentColor" /></span>;

function LoginPanel() {
  const { signIn } = useAuthSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true); setError('');
    try { signIn(await login({ usernameOrEmail: identifier, password })); }
    catch (err) { setError(err.message); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <div className="adm-login">
    <div className="adm-login-brand"><Brand /><h1>Không gian<br />quản trị tài khoản.</h1>
      <p>Theo dõi người dùng, cập nhật thông tin và quản lý quyền truy cập TaskMaster ở một nơi.</p>
      <div className="adm-login-note"><Icon name="shield-checkmark-outline" /><span>Dành riêng cho quản trị viên</span></div>
    </div>
    <section className="adm-login-form">
      <h2>Đăng nhập quản trị</h2><p>Sử dụng tài khoản đã được cấp quyền admin.</p>
      <form onSubmit={submit}>
        <label>Tên đăng nhập hoặc email<input autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} required disabled={busy} placeholder="Nhập tên đăng nhập" /></label>
        <label>Mật khẩu<span className="adm-password"><input type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} placeholder="Nhập mật khẩu" /><button type="button" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setVisible(!visible)}><Icon name={visible ? 'eye-off-outline' : 'eye-outline'} /></button></span></label>
        {error && <p role="alert" className="adm-error">{error}</p>}
        <button className="adm-button adm-primary" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}<Icon name="arrow-forward-outline" size={18} /></button>
      </form>
      <a href="/" className="adm-back"><Icon name="arrow-back-outline" size={16} />Trở về ứng dụng</a>
    </section>
  </div>;
}
function Brand() {
  return <div className="adm-brand"><span className="adm-brand-mark"><Icon name="checkbox-outline" size={24} /></span><span>TaskMaster<small>Trang quản trị</small></span></div>;
}

function AccountDialog({ action, close, onSave, busy, error }) {
  const dialog = useRef(null);
  const [fullName, setFullName] = useState(action.user.ho_ten || '');
  const [email, setEmail] = useState(action.user.email || '');
  useEffect(() => { const node = dialog.current; node.showModal(); return () => node.close(); }, []);
  const editing = action.type === 'edit';
  const locking = action.user.trang_thai;
  return <dialog ref={dialog} className="adm-dialog" aria-labelledby="adm-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) close(); }}>
    <form onSubmit={event => { event.preventDefault(); onSave(editing ? { fullName, email } : { active: !locking }); }}>
      <header><h2 id="adm-dialog-title">{editing ? 'Chỉnh sửa tài khoản' : locking ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}</h2><button type="button" className="adm-icon-button" aria-label="Đóng hộp thoại" disabled={busy} onClick={close}><Icon name="close-outline" /></button></header>
      <p className="adm-muted">{displayName(action.user)} · @{action.user.ten_dang_nhap}</p>
      {editing ? <>
        <label>Họ và tên<input value={fullName} maxLength={100} required disabled={busy} onChange={e => setFullName(e.target.value)} /></label>
        <label>Email<input type="email" value={email} maxLength={100} required disabled={busy} onChange={e => setEmail(e.target.value)} /></label>
        <p className="adm-help">Tên đăng nhập và vai trò của tài khoản được giữ nguyên.</p>
      </> : <p>{locking ? 'Người dùng sẽ không thể đăng nhập hoặc sử dụng các chức năng yêu cầu xác thực. Dữ liệu tài khoản vẫn được giữ lại.' : 'Người dùng có thể đăng nhập và tiếp tục sử dụng ứng dụng.'}</p>}
      {error && <p className="adm-error" role="alert">{error}</p>}
      <footer><button type="button" className="adm-button" disabled={busy} onClick={close}>Hủy</button><button className={'adm-button ' + (!editing && locking ? 'adm-danger' : 'adm-primary')} disabled={busy}>{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : locking ? 'Khóa tài khoản' : 'Mở khóa'}</button></footer>
    </form>
  </dialog>;
}

export default function AdminAccounts() {
  const { token, signOut, updateUser, user: sessionUser } = useAuthSession();
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);
  const [action, setAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const savingRef = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    let active = true;
    if (!token) return;
    const params = new URLSearchParams({ page: String(page), search, status, role });
    Promise.resolve().then(() => {
      if (!active) return null;
      setLoading(true); setError(''); setDenied(false);
      return Promise.all([apiFetch('/api/admin/summary'), apiFetch('/api/admin/users?' + params)]);
    })
      .then(result => {
        if (!active || !result) return;
        const [nextSummary, nextData] = result;
        setSummary(nextSummary); setData(nextData);
        if (page > 1 && !nextData.rows.length) setPage(Math.max(1, Math.ceil(nextData.total / 10)));
      })
      .catch(err => {
        if (!active) return;
        setSummary(null); setData({ rows: [], total: 0 }); setAction(null);
        setError(err.message); setDenied(err.status === 401 || err.status === 403);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, search, status, role, page, refresh]);

  async function logout() {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); }
    catch { /* Local logout still clears the saved session if the server is unreachable. */ }
    finally { setSummary(null); setData({ rows: [], total: 0 }); setAction(null); signOut(); }
  }
  async function save(body) {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setSaveError(''); setNotice('');
    try {
      await apiFetch('/api/admin/users/' + action.user.id + (action.type === 'edit' ? '' : '/status'), { method: 'PATCH', body });
      if (action.type === 'edit' && action.user.id === sessionUser?.id) updateUser({ fullName: body.fullName.trim(), email: body.email.trim() });
      setNotice(action.type === 'edit' ? 'Đã cập nhật thông tin tài khoản.' : body.active ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.');
      setAction(null); setRefresh(value => value + 1);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setAction(null); setSummary(null); setData({ rows: [], total: 0 }); setDenied(true); setError(err.message);
      } else setSaveError(err.message);
    } finally { savingRef.current = false; setSaving(false); }
  }
  function openAction(type, user) { setSaveError(''); setNotice(''); setAction({ type, user }); }
  const pages = Math.max(1, Math.ceil(data.total / 10));

  return <div className="tm-admin">
    {!token ? <LoginPanel /> : denied ? <div className="adm-access"><Icon name="lock-closed-outline" size={38} /><h1>Không có quyền truy cập</h1><p>{error}</p><p>Trang này chỉ dành cho tài khoản được cấp quyền admin.</p><button className="adm-button adm-primary" onClick={logout}>Đăng nhập bằng tài khoản khác</button><a href="/">Trở về ứng dụng</a></div> :
      <div className="adm-shell">
        <aside className="adm-sidebar">
          <Brand />
          <nav aria-label="Điều hướng quản trị"><a href="/admin" aria-current="page"><Icon name="people-outline" />Quản lý tài khoản</a></nav>
          <div className="adm-sidebar-bottom"><div className="adm-safety"><Icon name="shield-checkmark-outline" /><span>Khu vực quản trị<small>Truy cập được phân quyền</small></span></div><a href="/"><Icon name="arrow-back-outline" size={18} />Trở về ứng dụng</a></div>
        </aside>
        <div className="adm-workspace">
          <header className="adm-topbar"><span className="adm-breadcrumb">TaskMaster <span>/</span> Quản lý tài khoản</span><div className="adm-session"><span className="adm-avatar adm-avatar-small">{summary?.admin ? initials(summary.admin) : 'A'}</span><span>{summary?.admin ? displayName(summary.admin) : 'Quản trị viên'}<small>Quản trị viên</small></span><button type="button" className="adm-icon-button" title="Đăng xuất" aria-label="Đăng xuất" disabled={saving} onClick={logout}><Icon name="log-out-outline" /></button></div></header>
          <main className="adm-main">
            <div className="adm-heading"><div><h1>Quản lý tài khoản</h1><p>Xem và quản lý các tài khoản trong hệ thống TaskMaster.</p></div><button className="adm-button" disabled={loading || saving} onClick={() => { setNotice(''); setRefresh(value => value + 1); }}><Icon name="refresh-outline" size={17} />Làm mới</button></div>
            <section className="adm-summary" aria-label="Thống kê tài khoản">
              {[['Tổng tài khoản', summary?.total, 'people-outline', 'all'], ['Đang hoạt động', summary?.active, 'checkmark-circle-outline', 'active'], ['Đã khóa', summary?.locked, 'lock-closed-outline', 'locked']].map(([label, value, icon, tone]) => <div key={tone}><span className={'adm-summary-symbol ' + tone}><Icon name={icon} size={23} /></span><div><span className="adm-muted">{label}</span><strong>{value == null ? '—' : value.toLocaleString('vi-VN')}</strong></div></div>)}
            </section>
            {notice && <div className="adm-notice" role="status"><Icon name="checkmark-circle-outline" size={18} />{notice}<button className="adm-icon-button" aria-label="Đóng thông báo" onClick={() => setNotice('')}><Icon name="close-outline" size={18} /></button></div>}
            <section className="adm-list" aria-labelledby="adm-list-title" aria-busy={loading}>
              <div className="adm-list-heading"><h2 id="adm-list-title">Danh sách tài khoản</h2><span className="adm-count">{data.total} tài khoản</span></div>
              <div className="adm-toolbar">
                <label className="adm-search"><Icon name="search-outline" /><input aria-label="Tìm tài khoản" placeholder="Tìm tên, tên đăng nhập hoặc email…" value={query} onChange={e => setQuery(e.target.value)} maxLength={100} />{query && <button className="adm-icon-button" aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}><Icon name="close-outline" size={17} /></button>}</label>
                <label className="adm-filter"><span>Trạng thái</span><select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="locked">Đã khóa</option></select></label>
                <label className="adm-filter"><span>Vai trò</span><select value={role} onChange={e => { setRole(e.target.value); setPage(1); }}><option value="">Tất cả vai trò</option><option value="ADMIN">Quản trị viên</option><option value="USER">Người dùng</option></select></label>
              </div>
              {error ? <div className="adm-empty" role="alert"><Icon name="cloud-offline-outline" size={32} /><h3>Chưa tải được tài khoản</h3><p>{error}</p><button className="adm-button" onClick={() => setRefresh(value => value + 1)}>Thử lại</button></div> : loading ? <div className="adm-empty" role="status"><span className="adm-spinner" /><p>Đang tải danh sách tài khoản…</p></div> : !data.rows.length ? <div className="adm-empty"><Icon name="search-outline" size={32} /><h3>{search || status || role ? 'Không tìm thấy tài khoản phù hợp' : 'Chưa có tài khoản'}</h3><p>{search || status || role ? 'Thử một từ khóa khác hoặc xóa bộ lọc.' : 'Tài khoản đã đăng ký sẽ hiển thị tại đây.'}</p>{!!(query || status || role) && <button className="adm-button" onClick={() => { setQuery(''); setSearch(''); setStatus(''); setRole(''); setPage(1); }}>Xóa bộ lọc</button>}</div> :
                <div className="adm-table-scroll" tabIndex={0} role="region" aria-label="Bảng tài khoản, cuộn ngang trên màn hình nhỏ">
                  <table><thead><tr><th scope="col">Người dùng</th><th scope="col">Email</th><th scope="col">Vai trò</th><th scope="col">Trạng thái</th><th scope="col">Ngày tạo</th><th scope="col" className="adm-actions-heading">Thao tác</th></tr></thead>
                    <tbody>{data.rows.map(account => <tr key={account.id}>
                      <td><div className="adm-user-cell"><span className="adm-avatar">{initials(account)}</span><span><strong>{displayName(account)}</strong><small>@{account.ten_dang_nhap}</small></span></div></td>
                      <td className="adm-email">{account.email}</td>
                      <td><span className={'adm-role ' + (account.vai_tro === 'ADMIN' ? 'admin' : '')}>{account.vai_tro === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'}</span></td>
                      <td><span className={'adm-status ' + (account.trang_thai ? 'active' : 'locked')}><span />{account.trang_thai ? 'Hoạt động' : 'Đã khóa'}</span></td>
                      <td className="adm-date">{formatDate(account.ngay_tao)}</td>
                      <td><div className="adm-row-actions"><button className="adm-icon-button" title="Sửa thông tin" aria-label={'Sửa tài khoản ' + account.ten_dang_nhap} onClick={() => openAction('edit', account)}><Icon name="create-outline" size={19} /></button><button className={'adm-icon-button ' + (account.trang_thai ? 'adm-lock-action' : 'adm-unlock-action')} title={account.vai_tro === 'ADMIN' ? 'Không thể khóa quản trị viên' : account.trang_thai ? 'Khóa tài khoản' : 'Mở khóa tài khoản'} disabled={account.vai_tro === 'ADMIN'} aria-label={(account.trang_thai ? 'Khóa ' : 'Mở khóa ') + account.ten_dang_nhap} onClick={() => openAction('status', account)}><Icon name={account.trang_thai ? 'lock-closed-outline' : 'lock-open-outline'} size={18} /></button></div></td>
                    </tr>)}</tbody>
                  </table>
                </div>}
              <footer className="adm-pagination"><span>{loading ? 'Đang tải…' : data.total ? 'Hiển thị ' + ((page - 1) * 10 + 1) + '–' + Math.min(page * 10, data.total) + ' trong ' + data.total + ' tài khoản' : '0 tài khoản'}</span><div><button className="adm-icon-button" aria-label="Trang trước" disabled={loading || page <= 1 || !!error} onClick={() => setPage(value => value - 1)}><Icon name="chevron-back-outline" size={17} /></button><span>Trang {page} / {pages}</span><button className="adm-icon-button" aria-label="Trang sau" disabled={loading || page >= pages || !!error} onClick={() => setPage(value => value + 1)}><Icon name="chevron-forward-outline" size={17} /></button></div></footer>
            </section>
            <div className="adm-footnote"><Icon name="information-circle-outline" size={16} /><span>Khóa tài khoản sẽ hạn chế truy cập nhưng không xóa dữ liệu của người dùng.</span></div>
          </main>
        </div>
      </div>}
    {action && <AccountDialog key={action.type + action.user.id} action={action} close={() => setAction(null)} onSave={save} busy={saving} error={saveError} />}
  </div>;
}
