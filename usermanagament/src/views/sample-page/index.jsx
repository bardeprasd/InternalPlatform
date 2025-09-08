import React, { useCallback, useEffect, useMemo, useState } from 'react';

// material-ui
import Typography from '@mui/material/Typography';
import MainCard from 'ui-component/cards/MainCard';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';

// icons
import EditIcon from '@mui/icons-material/Edit';
import ShieldIcon from '@mui/icons-material/Shield';
import LockResetIcon from '@mui/icons-material/LockReset';

// ==============================|| SINGLE-FILE USER MANAGEMENT PAGE ||============================== //

export default function SamplePage() {
  // ---------- Roles/Permissions ----------
  const ROLES = {
    ADMIN: 'Admin',
    COMPLIANCE: 'Compliance Officer',
    REPORTER: 'Reporter',
    AUDITOR: 'Auditor',
    VIEWER: 'Viewer'
  };

  const PERMISSIONS = {
    MANAGE_USERS: 'manage_users',
    VIEW_USERS: 'view_users',
    EDIT_PROFILE: 'edit_profile',
    VIEW_AUDIT: 'view_audit',
    SUBMIT_REPORTS: 'submit_reports',
    VIEW_REPORTS: 'view_reports'
  };

  const ROLE_MATRIX = {
    [ROLES.ADMIN]: [
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.VIEW_USERS,
      PERMISSIONS.EDIT_PROFILE,
      PERMISSIONS.VIEW_AUDIT,
      PERMISSIONS.SUBMIT_REPORTS,
      PERMISSIONS.VIEW_REPORTS
    ],
    [ROLES.COMPLIANCE]: [PERMISSIONS.VIEW_USERS, PERMISSIONS.VIEW_AUDIT, PERMISSIONS.VIEW_REPORTS],
    [ROLES.REPORTER]: [PERMISSIONS.EDIT_PROFILE, PERMISSIONS.SUBMIT_REPORTS, PERMISSIONS.VIEW_REPORTS],
    [ROLES.AUDITOR]: [PERMISSIONS.VIEW_AUDIT, PERMISSIONS.VIEW_REPORTS],
    [ROLES.VIEWER]: [PERMISSIONS.VIEW_REPORTS]
  };

  const hasPermission = (role, permission) => (ROLE_MATRIX[role] || []).includes(permission);

  // ---------- LocalStorage "DB" ----------
  const LS_KEY = 'regx.users.v1';
  const AUDIT_KEY = 'regx.user_audit.v1';

  const seedUsers = [
    { id: 'u-1001', name: 'Asha Kapoor', email: 'asha.kapoor@reg-x.example', role: ROLES.ADMIN, status: 'Active', createdAt: new Date().toISOString() },
    { id: 'u-1002', name: 'Vikram Shah', email: 'vikram.shah@reg-x.example', role: ROLES.COMPLIANCE, status: 'Active', createdAt: new Date().toISOString() },
    { id: 'u-1003', name: 'Neha Joshi', email: 'neha.joshi@reg-x.example', role: ROLES.REPORTER, status: 'Disabled', createdAt: new Date().toISOString() },
    { id: 'u-1004', name: 'Arun Mehta', email: 'arun.mehta@reg-x.example', role: ROLES.AUDITOR, status: 'Active', createdAt: new Date().toISOString() }
  ];

  const readUsers = () => {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(seedUsers));
      return [...seedUsers];
    }
    try { return JSON.parse(raw); } catch { localStorage.setItem(LS_KEY, JSON.stringify(seedUsers)); return [...seedUsers]; }
  };
  const writeUsers = (users) => localStorage.setItem(LS_KEY, JSON.stringify(users));

  const readAudit = () => {
    const raw = localStorage.getItem(AUDIT_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_KEY, JSON.stringify([]));
      return [];
    }
    try { return JSON.parse(raw); } catch { localStorage.setItem(AUDIT_KEY, JSON.stringify([])); return []; }
  };
  const writeAudit = (entries) => localStorage.setItem(AUDIT_KEY, JSON.stringify(entries));

  const uid = () => 'u-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

  const UserStore = {
    list({ search = '', role = 'All', status = 'All', sortBy = 'createdAt', sortDir = 'desc', page = 0, pageSize = 10 }) {
      let data = readUsers();

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        data = data.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
      }
      if (role !== 'All') data = data.filter(u => u.role === role);
      if (status !== 'All') data = data.filter(u => u.status === status);

      data.sort((a, b) => {
        const A = a[sortBy], B = b[sortBy];
        if (A === B) return 0;
        return sortDir === 'asc' ? (A > B ? 1 : -1) : (A < B ? 1 : -1);
      });

      const total = data.length;
      const start = page * pageSize;
      const end = start + pageSize;
      return { rows: data.slice(start, end), total };
    },
    create(payload, actor = 'system') {
      const users = readUsers();
      const record = { id: uid(), name: payload.name, email: payload.email, role: payload.role, status: payload.status || 'Active', createdAt: new Date().toISOString() };
      users.push(record);
      writeUsers(users);
      this.audit('CREATE_USER', actor, { id: record.id, email: record.email, role: record.role, status: record.status });
      return record;
    },
    update(id, patch, actor = 'system') {
      const users = readUsers();
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) throw new Error('User not found');
      const after = { ...users[idx], ...patch };
      users[idx] = after;
      writeUsers(users);
      this.audit('UPDATE_USER', actor, { id, patch });
      return after;
    },
    disable(id, actor = 'system') { return this.update(id, { status: 'Disabled' }, actor); },
    resetPassword(id, actor = 'system') {
      const token = Math.random().toString(36).slice(2, 10);
      this.audit('RESET_PASSWORD', actor, { id, token });
      return token;
    },
    audit(action, actor, meta) {
      const entries = readAudit();
      entries.unshift({ id: 'a-' + Math.random().toString(36).slice(2, 10), ts: new Date().toISOString(), action, actor, meta });
      writeAudit(entries);
    },
    getAudit(limit = 100) { return readAudit().slice(0, limit); }
  };

  // ---------- UI State ----------
  const CURRENT_USER = { id: 'u-admin', name: 'You (Admin)', role: ROLES.ADMIN };
  const canManage = hasPermission(CURRENT_USER.role, PERMISSIONS.MANAGE_USERS);
  const canViewAudit = hasPermission(CURRENT_USER.role, PERMISSIONS.VIEW_AUDIT);

  const [filters, setFilters] = useState({ search: '', role: 'All', status: 'All' });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState({ rows: [], total: 0 });

  const [editOpen, setEditOpen] = useState(false);
  const [editInitial, setEditInitial] = useState(null);
  const [toast, setToast] = useState('');
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEntries, setAuditEntries] = useState([]);

  const reload = useCallback(() => {
    setData(
      UserStore.list({
        ...filters,
        sortBy: 'createdAt',
        sortDir: 'desc',
        page,
        pageSize
      })
    );
  }, [filters, page, pageSize]);

  useEffect(() => { reload(); }, [reload]);

  // ---------- Inline UI pieces ----------
  const RoleBadge = ({ role }) => {
    let color = 'default';
    switch (role) {
      case ROLES.ADMIN: color = 'error'; break;
      case ROLES.COMPLIANCE: color = 'warning'; break;
      case ROLES.AUDITOR: color = 'info'; break;
      case ROLES.REPORTER: color = 'success'; break;
      default: color = 'default';
    }
    return <Chip size="small" label={role} color={color} variant="outlined" />;
  };

  const statuses = ['All', 'Active', 'Disabled'];
  const rolesAll = ['All', ...Object.values(ROLES)];

  const UserFilters = () => (
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Search name or email"
          value={filters.search}
          onChange={(e) => { setPage(0); setFilters({ ...filters, search: e.target.value }); }}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <TextField
          select fullWidth label="Role" value={filters.role}
          onChange={(e) => { setPage(0); setFilters({ ...filters, role: e.target.value }); }}
        >
          {rolesAll.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={6} md={3}>
        <TextField
          select fullWidth label="Status" value={filters.status}
          onChange={(e) => { setPage(0); setFilters({ ...filters, status: e.target.value }); }}
        >
          {statuses.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Grid>
    </Grid>
  );

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const EditUserDialog = ({ open, onClose, initial }) => {
    const roles = Object.values(ROLES);
    const stateInit = initial || { name: '', email: '', role: roles[2], status: 'Active' };
    const [form, setForm] = useState(stateInit);
    const [error, setError] = useState('');

    useEffect(() => { if (open) { setForm(stateInit); setError(''); } }, [open, initial]); // eslint-disable-line

    const validate = () => {
      if (!form.name.trim()) return 'Name is required';
      if (!isEmail(form.email)) return 'Email is invalid';
      if (!roles.includes(form.role)) return 'Role is invalid';
      if (!['Active', 'Disabled'].includes(form.status)) return 'Status is invalid';
      return '';
    };

    const submit = () => {
      const v = validate();
      if (v) { setError(v); return; }
      onClose({ ...form, id: initial?.id });
    };

    return (
      <Dialog open={open} onClose={() => onClose(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{initial?.id ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent dividers>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="Full name" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Email" fullWidth value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {roles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['Active', 'Disabled'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => onClose(null)}>Cancel</Button>
          <Button variant="contained" onClick={submit}>{initial?.id ? 'Save' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    );
  };

  const AuditDrawer = ({ open, onClose, entries }) => (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 420, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>User Audit Trail</Typography>
        <Divider sx={{ mb: 2 }} />
        <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {entries.map(e => (
            <li key={e.id} style={{ marginBottom: 12 }}>
              <Typography variant="subtitle2">
                {e.action} • {new Date(e.ts).toLocaleString()} • by {e.actor}
              </Typography>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(e.meta, null, 2)}</pre>
            </li>
          ))}
          {entries.length === 0 ? <Typography color="text.secondary">No audit entries.</Typography> : null}
        </Box>
      </Box>
    </Drawer>
  );

  // ---------- Handlers ----------
  const openAdd = () => { setEditInitial(null); setEditOpen(true); };
  const openEdit = (row) => { setEditInitial(row); setEditOpen(true); };

  const onDialogClose = (payload) => {
    setEditOpen(false);
    if (!payload) return;
    try {
      if (payload.id) {
        UserStore.update(payload.id, { name: payload.name, email: payload.email, role: payload.role, status: payload.status }, CURRENT_USER.name);
        setToast('User updated');
      } else {
        UserStore.create(payload, CURRENT_USER.name);
        setToast('User created');
      }
      reload();
    } catch (e) {
      setToast(e.message || 'Operation failed');
    }
  };

  const onDisable = (row) => {
    if (!canManage) return;
    UserStore.disable(row.id, CURRENT_USER.name);
    setToast('User disabled');
    reload();
  };

  const onReset = (row) => {
    const token = UserStore.resetPassword(row.id, CURRENT_USER.name);
    setToast(`Reset link token: ${token}`);
  };

  const openAudit = () => {
    setAuditEntries(UserStore.getAudit(120));
    setAuditOpen(true);
  };

  // ---------- Table ----------
  const UsersTable = ({ rows, total }) => {
    const cols = useMemo(() => ([
      { id: 'name', label: 'Name', width: 200 },
      { id: 'email', label: 'Email', width: 250 },
      { id: 'role', label: 'Role', width: 160 },
      { id: 'status', label: 'Status', width: 120 },
      { id: 'createdAt', label: 'Created', width: 180 },
      { id: 'actions', label: 'Actions', width: 160 }
    ]), []);

    return (
      <Paper variant="outlined">
        <TableContainer>
          <Table size="small" aria-label="users">
            <TableHead>
              <TableRow>
                {cols.map(col => (
                  <TableCell key={col.id} style={{ width: col.width, fontWeight: 600 }}>{col.label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => (
                <TableRow hover key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell><RoleBadge role={r.role} /></TableCell>
                  <TableCell>
                    <Chip size="small" label={r.status} color={r.status === 'Active' ? 'success' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(r)}><EditIcon fontSize="inherit" /></IconButton>
                      </Tooltip>
                      <Tooltip title={r.status === 'Active' ? 'Disable user' : 'Already disabled'}>
                        <span>
                          <IconButton size="small" onClick={() => onDisable(r)} disabled={r.status !== 'Active'}>
                            <ShieldIcon fontSize="inherit" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Reset password (mock)">
                        <IconButton size="small" onClick={() => onReset(r)}><LockResetIcon fontSize="inherit" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No users found</TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          rowsPerPageOptions={[5, 10, 25]}
          count={total}
          rowsPerPage={pageSize}
          page={page}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setPage(0); setPageSize(parseInt(e.target.value, 10)); }}
        />
      </Paper>
    );
  };

  // ---------- Render ----------
  return (
    <MainCard title="User Management">
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Manage platform users, roles and access for your regulation reporting workspace.
        </Typography>

        <UserFilters />

        <Divider />

        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography variant="subtitle2">Total: {data.total}</Typography>
          </Grid>
          <Grid item>
            <Stack direction="row" spacing={1}>
              {canViewAudit ? <Button variant="outlined" onClick={openAudit}>View Audit Trail</Button> : null}
              {canManage ? <Button variant="contained" onClick={() => setEditOpen(true)}>Add User</Button> : null}
            </Stack>
          </Grid>
        </Grid>

        <UsersTable rows={data.rows} total={data.total} />

        <EditUserDialog open={editOpen} onClose={onDialogClose} initial={editInitial} />
        <AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} entries={auditEntries} />

        <Snackbar
          open={Boolean(toast)}
          autoHideDuration={3000}
          onClose={() => setToast('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          {toast ? <Alert severity="success" variant="filled">{toast}</Alert> : null}
        </Snackbar>
      </Stack>
    </MainCard>
  );
}
