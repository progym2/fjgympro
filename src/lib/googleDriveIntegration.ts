// Google Drive integration for backup/restore
// Uses Google Identity Services for client-side OAuth

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FOLDER_NAME = 'FrancGymPro Backups';
const BACKUP_FILE_PREFIX = 'francgym-backup-';

let tokenClient: any = null;
let accessToken: string | null = null;

// Check if Google API is loaded
export function isGoogleDriveAvailable(): boolean {
  return typeof gapi !== 'undefined' && !!GOOGLE_CLIENT_ID;
}

// Initialize Google API
export async function initGoogleDrive(): Promise<boolean> {
  if (!GOOGLE_CLIENT_ID) {
    console.log('Google Client ID not configured');
    return false;
  }

  return new Promise((resolve) => {
    // Load Google Identity Services script
    if (typeof google === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        // Load GAPI for Drive API
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.onload = async () => {
          await new Promise<void>((res) => gapi.load('client', res));
          await gapi.client.init({
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          });
          resolve(true);
        };
        gapiScript.onerror = () => resolve(false);
        document.body.appendChild(gapiScript);
      };
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    } else {
      resolve(true);
    }
  });
}

// Request OAuth token
export function requestGoogleAuth(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) {
      reject(new Error('Google Client ID not configured'));
      return;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        accessToken = response.access_token;
        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt: '' });
  });
}

// Get or create backup folder
async function getOrCreateBackupFolder(): Promise<string> {
  if (!accessToken) throw new Error('Not authenticated');

  // Search for existing folder
  const response = await gapi.client.drive.files.list({
    q: `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (response.result.files && response.result.files.length > 0) {
    return response.result.files[0].id!;
  }

  // Create folder
  const createResponse = await gapi.client.drive.files.create({
    resource: {
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return createResponse.result.id!;
}

// Upload backup to Google Drive
export async function uploadBackupToDrive(backup: any): Promise<{ id: string; name: string }> {
  if (!accessToken) {
    await requestGoogleAuth();
  }

  const folderId = await getOrCreateBackupFolder();
  const fileName = `${BACKUP_FILE_PREFIX}${new Date().toISOString().split('T')[0]}.json`;
  const fileContent = JSON.stringify(backup, null, 2);
  
  const boundary = '-------314159265358979323846';
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelimiter = '\r\n--' + boundary + '--';

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: [folderId],
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    throw new Error('Failed to upload backup');
  }

  return response.json();
}

// List backups from Google Drive
export async function listDriveBackups(): Promise<{ id: string; name: string; modifiedTime: string }[]> {
  if (!accessToken) {
    await requestGoogleAuth();
  }

  const folderId = await getOrCreateBackupFolder();

  const response = await gapi.client.drive.files.list({
    q: `'${folderId}' in parents and name contains '${BACKUP_FILE_PREFIX}' and trashed=false`,
    fields: 'files(id, name, modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: 10,
  });

  return response.result.files || [];
}

// Download backup from Google Drive
export async function downloadBackupFromDrive(fileId: string): Promise<any> {
  if (!accessToken) {
    await requestGoogleAuth();
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to download backup');
  }

  return response.json();
}

// Check if user is authenticated
export function isGoogleAuthenticated(): boolean {
  return !!accessToken;
}

// Sign out
export function signOutGoogle(): void {
  accessToken = null;
  if (typeof google !== 'undefined' && google.accounts?.oauth2) {
    google.accounts.oauth2.revoke(accessToken || '');
  }
}

// Declare global types
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
  const gapi: any;
  const google: any;
}
