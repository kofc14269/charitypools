export const ensureDropboxChooser = (appKey?: string): Promise<void> => new Promise((res) => {
  if ((window as any).Dropbox) return res();
  const s = document.createElement('script');
  s.src = 'https://www.dropbox.com/static/api/2/dropins.js';
  s.id = 'dropboxjs';
  s.setAttribute('data-app-key', String(appKey || ''));
  s.onload = () => res();
  document.head.appendChild(s);
});

export const uploadFileToGitHub = async (file: Blob | File, repo: string, token: string, pathPrefix = 'assets') => {
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) throw new Error('Invalid repo (owner/repo)');
  const repoResp = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers: { Authorization: `token ${token}` } });
  if (!repoResp.ok) throw new Error('Failed to read repo info: ' + await repoResp.text());
  const repoJson = await repoResp.json();
  const branch = repoJson.default_branch || 'main';

  const arrayBuffer = await (file as Blob).arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const targetPath = `${pathPrefix}/${Date.now()}_${(file as File).name || 'logo'}`;

  const putResp = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(targetPath)}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Add logo ${(file as File).name || 'logo'}`, content: b64, branch })
  });
  if (!putResp.ok) throw new Error('GitHub upload failed: ' + await putResp.text());
  
  return `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${targetPath}`;
};
