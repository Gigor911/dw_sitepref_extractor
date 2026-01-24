import { openDB } from 'idb';

const DB_NAME = 'site-pref-extractor-db';
const STORE_NAME = 'xml-data';
const HISTORY_STORE_NAME = 'file-history';
const KEY = 'parsed-tree';
const CURRENT_FILE_KEY = 'current-file-id';

export const initDB = async () => {
    return openDB(DB_NAME, 2, {
        upgrade(db, oldVersion) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
            if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
                db.createObjectStore(HISTORY_STORE_NAME);
            }
        },
    });
};

export const saveParsedData = async (data) => {
    const db = await initDB();
    await db.put(STORE_NAME, data, KEY);
};

export const getParsedData = async () => {
    const db = await initDB();
    return await db.get(STORE_NAME, KEY);
};

export const clearParsedData = async () => {
    const db = await initDB();
    await db.delete(STORE_NAME, KEY);
};

// File History Management
export const saveFileToHistory = async (fileId, data) => {
    const db = await initDB();
    await db.put(HISTORY_STORE_NAME, data, fileId);
    await db.put(STORE_NAME, fileId, CURRENT_FILE_KEY);
};

export const updateFileState = async (fileId, fileState) => {
    const db = await initDB();
    const existingData = await db.get(HISTORY_STORE_NAME, fileId);
    if (existingData) {
        await db.put(HISTORY_STORE_NAME, { ...existingData, fileState }, fileId);
    }
};

export const getFileFromHistory = async (fileId) => {
    const db = await initDB();
    return await db.get(HISTORY_STORE_NAME, fileId);
};

export const getCurrentFileId = async () => {
    const db = await initDB();
    return await db.get(STORE_NAME, CURRENT_FILE_KEY);
};

export const getAllFileHistory = async () => {
    const db = await initDB();
    const keys = await db.getAllKeys(HISTORY_STORE_NAME);
    const files = await Promise.all(
        keys.map(async (key) => {
            const data = await db.get(HISTORY_STORE_NAME, key);
            return { id: key, ...data };
        })
    );
    // Sort by uploadedAt descending
    return files.sort((a, b) => b.fileInfo.uploadedAt - a.fileInfo.uploadedAt).slice(0, 5);
};

export const deleteFileFromHistory = async (fileId) => {
    const db = await initDB();
    await db.delete(HISTORY_STORE_NAME, fileId);
};

// App State Management
const APP_STATE_KEY = 'app-state';

export const saveAppState = async (state) => {
    const db = await initDB();
    await db.put(STORE_NAME, state, APP_STATE_KEY);
};

export const getAppState = async () => {
    const db = await initDB();
    return await db.get(STORE_NAME, APP_STATE_KEY);
};

