import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { css } from '../styles/shared';

export default function Assets({ clientId }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folderPath, setFolderPath] = useState('/');
  const [modal, setModal] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAssets(); }, [clientId, folderPath]);

  const fetchAssets = async () => {
    const { data } = await supabase
      .from('assets')
      .select('*')
      .eq('client_id', clientId)
      .eq('folder_path', folderPath)
      .order('is_folder', { ascending: false })
      .order('name', { ascending: true });
    setAssets(data || []);
    setLoading(false);
  };

  const createFolder = async () => {
    if (!folderName.trim()) return;
    setSaving(true);
    await supabase.from('assets').insert({
      client_id: clientId,
      name: folderName.trim(),
      is_folder: true,
      folder_path: folderPath,
      file_type: 'folder',
    });
    setModal(null);
    setFolderName('');
    await fetchAssets();
    setSaving(false);
  };

  const navigateInto = (folder) => {
    const newPath = folderPath === '/' ? `/${folder.name}/` : `${folderPath}${folder.name}/`;
    setFolderPath(newPath);
  };

  const navigateUp = () => {
    if (folderPath === '/') return;
    const parts = folderPath.split('/').filter(Boolean);
    parts.pop();
    setFolderPath(parts.length === 0 ? '/' : `/${parts.join('/')}/`);
  };

  const breadcrumbs = folderPath === '/' ? [] : folderPath.split('/').filter(Boolean);

  const fileIcon = (asset) => {
    if (asset.is_folder) return '📁';
    const t = (asset.file_type || '').toLowerCase();
    if (t === 'pdf') return '📄';
    if (t === 'zip') return '🗂️';
    if (['fig', 'figma'].includes(t)) return '🎨';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(t)) return '🖼️';
    if (['doc', 'docx', 'word'].includes(t)) return '✍️';
    if (['mp4', 'mov', 'video'].includes(t)) return '🎬';
    return '📎';
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  if (loading) return <div style={css.loading}>Loading assets…</div>;

  return (
    <>
      {/* Header */}
      <div className="rsp-stack-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate)' }}>
          <span style={{ color: 'var(--blue)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setFolderPath('/')}>All Files</span>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--border)' }}>/</span>
              <span style={{ color: 'var(--blue)', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setFolderPath(`/${breadcrumbs.slice(0, i + 1).join('/')}/`)}>
                {crumb}
              </span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={css.secondaryBtn} onClick={() => setModal('folder')}>+ New Folder</button>
          <button style={css.primaryBtn} onClick={() => setModal('upload')}>Upload File</button>
        </div>
      </div>

      {/* Grid */}
      {assets.length === 0 ? (
        <div style={css.card}><div style={css.empty}>No files here yet.</div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 14 }}>
          {assets.map(asset => (
            <div key={asset.id}
              onClick={() => asset.is_folder ? navigateInto(asset) : asset.drive_url && window.open(asset.drive_url, '_blank')}
              style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--white)', cursor: 'pointer', boxShadow: 'var(--shadow)', transition: 'box-shadow 0.14s' }}>
              <div style={{ height: 95, background: asset.is_folder ? 'var(--blue-light)' : 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: asset.is_folder ? 34 : 30, borderBottom: '1px solid var(--border)' }}>
                {fileIcon(asset)}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</div>
                <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{asset.is_folder ? 'Folder' : asset.file_type}</div>
                <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 5 }}>{fmtDate(asset.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Folder Modal */}
      {modal === 'folder' && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>New Folder</div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Folder Name</label>
              <input style={css.formInput} placeholder="e.g. Campaign Assets, Q2 Deliverables…" value={folderName} onChange={e => setFolderName(e.target.value)} />
            </div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={css.btnSubmit} onClick={createFolder} disabled={saving}>{saving ? 'Creating…' : 'Create Folder'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {modal === 'upload' && (
        <div style={css.overlay} onClick={() => setModal(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <div style={css.modalTitle}>Upload File</div>
            <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '32px 24px', textAlign: 'center', background: 'var(--cream)', marginBottom: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>☁️</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Drop files here or click to browse</div>
              <div style={{ fontSize: 12, color: 'var(--slate)' }}>Files will be saved to Google Drive</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 16 }}>
              Note: Google Drive integration coming soon. For now, paste a Google Drive share link below.
            </div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>File Name</label>
              <input style={css.formInput} placeholder="e.g. Brand Guidelines v2.pdf" id="upload-name" />
            </div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>Google Drive Link</label>
              <input style={css.formInput} placeholder="https://drive.google.com/..." id="upload-url" />
            </div>
            <div style={css.formGroup}>
              <label style={css.formLabel}>File Type</label>
              <input style={css.formInput} placeholder="PDF, ZIP, Figma…" id="upload-type" />
            </div>
            <div style={css.modalActions}>
              <button style={css.btnCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={css.btnSubmit} onClick={async () => {
                const name = document.getElementById('upload-name').value;
                const url = document.getElementById('upload-url').value;
                const type = document.getElementById('upload-type').value;
                if (!name) return;
                await supabase.from('assets').insert({ client_id: clientId, name, drive_url: url, file_type: type, folder_path: folderPath, is_folder: false });
                setModal(null);
                fetchAssets();
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
