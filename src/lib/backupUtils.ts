import { supabase } from '@/integrations/supabase/client';

interface BackupData {
  version: string;
  timestamp: string;
  profileId: string;
  data: {
    profile: any;
    workoutPlans: any[];
    workoutLogs: any[];
    mealPlans: any[];
    weightRecords: any[];
    hydrationRecords: any[];
    evolutionPhotos: any[];
    personalRecords: any[];
  };
}

// Export user data to JSON
export async function exportUserData(profileId: string): Promise<BackupData | null> {
  try {
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    // Fetch workout plans
    const { data: workoutPlans } = await supabase
      .from('workout_plans')
      .select('*, workout_plan_exercises(*)')
      .or(`created_by.eq.${profileId},assigned_to.eq.${profileId}`);

    // Fetch workout logs
    const { data: workoutLogs } = await supabase
      .from('workout_logs')
      .select('*, workout_exercise_logs(*)')
      .eq('profile_id', profileId);

    // Fetch meal plans
    const { data: mealPlans } = await supabase
      .from('meal_plans')
      .select('*')
      .or(`created_by.eq.${profileId},assigned_to.eq.${profileId}`);

    // Fetch weight records
    const { data: weightRecords } = await supabase
      .from('weight_records')
      .select('*')
      .eq('profile_id', profileId);

    // Fetch hydration records
    const { data: hydrationRecords } = await supabase
      .from('hydration_records')
      .select('*')
      .eq('profile_id', profileId);

    // Fetch evolution photos
    const { data: evolutionPhotos } = await supabase
      .from('evolution_photos')
      .select('*')
      .eq('profile_id', profileId);

    // Fetch personal records
    const { data: personalRecords } = await supabase
      .from('personal_records')
      .select('*')
      .eq('profile_id', profileId);

    const backup: BackupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      profileId,
      data: {
        profile,
        workoutPlans: workoutPlans || [],
        workoutLogs: workoutLogs || [],
        mealPlans: mealPlans || [],
        weightRecords: weightRecords || [],
        hydrationRecords: hydrationRecords || [],
        evolutionPhotos: evolutionPhotos || [],
        personalRecords: personalRecords || [],
      },
    };

    return backup;
  } catch (error) {
    console.error('Error exporting data:', error);
    return null;
  }
}

// Download backup as JSON file
export function downloadBackup(backup: BackupData, filename?: string) {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `francgym-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Read backup file
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.version || !data.data) {
          reject(new Error('Arquivo de backup inválido'));
          return;
        }
        resolve(data);
      } catch (error) {
        reject(new Error('Erro ao ler arquivo de backup'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
}

// Restore weight records from backup
export async function restoreWeightRecords(profileId: string, records: any[]): Promise<number> {
  let restored = 0;
  for (const record of records) {
    const { error } = await supabase.from('weight_records').upsert({
      ...record,
      profile_id: profileId,
    }, { onConflict: 'id' });
    if (!error) restored++;
  }
  return restored;
}

// Restore hydration records from backup
export async function restoreHydrationRecords(profileId: string, records: any[]): Promise<number> {
  let restored = 0;
  for (const record of records) {
    const { error } = await supabase.from('hydration_records').upsert({
      ...record,
      profile_id: profileId,
    }, { onConflict: 'id' });
    if (!error) restored++;
  }
  return restored;
}

// Save backup to IndexedDB for offline access
const BACKUP_DB_NAME = 'francgym_backup_db';
const BACKUP_STORE_NAME = 'backups';

let backupDb: IDBDatabase | null = null;

async function openBackupDB(): Promise<IDBDatabase> {
  if (backupDb) return backupDb;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BACKUP_DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      backupDb = request.result;
      resolve(backupDb);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(BACKUP_STORE_NAME)) {
        db.createObjectStore(BACKUP_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveBackupLocally(backup: BackupData): Promise<void> {
  const db = await openBackupDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BACKUP_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(BACKUP_STORE_NAME);
    
    const request = store.put({
      id: backup.profileId,
      backup,
      savedAt: new Date().toISOString(),
    });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadLocalBackup(profileId: string): Promise<BackupData | null> {
  const db = await openBackupDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BACKUP_STORE_NAME, 'readonly');
    const store = transaction.objectStore(BACKUP_STORE_NAME);
    
    const request = store.get(profileId);
    
    request.onsuccess = () => {
      const result = request.result;
      resolve(result?.backup || null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalBackupInfo(profileId: string): Promise<{ savedAt: string } | null> {
  const db = await openBackupDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BACKUP_STORE_NAME, 'readonly');
    const store = transaction.objectStore(BACKUP_STORE_NAME);
    
    const request = store.get(profileId);
    
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? { savedAt: result.savedAt } : null);
    };
    request.onerror = () => reject(request.error);
  });
}
