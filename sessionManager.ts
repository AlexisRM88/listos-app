import { UserProfile } from './types';
import cacheService from './services/cacheService';

const USER_PROFILE_KEY = 'listosAppUserProfile';
const PRO_STATUS_KEY = 'listosAppIsPro';
const WORKSHEET_COUNTS_KEY = 'listosAppWorksheetCounts';

interface SessionData {
    userProfile: UserProfile | null;
    isPro: boolean;
    worksheetCount: number;
}

/**
 * Loads all session-related data from localStorage for a given user.
 * Uses cache for better performance.
 */
export const loadSession = (): SessionData => {
    try {
        // Intentar obtener de la caché primero
        const cachedSession = cacheService.get('session', 'current');
        if (cachedSession) {
            return cachedSession as SessionData;
        }
        
        const savedUser = localStorage.getItem(USER_PROFILE_KEY);
        if (!savedUser) return { userProfile: null, isPro: false, worksheetCount: 0 };

        const userProfile: UserProfile = JSON.parse(savedUser);
        
        const allProStatus = JSON.parse(localStorage.getItem(PRO_STATUS_KEY) || '{}');
        const isPro = allProStatus[userProfile.id] || false;

        const allCounts = JSON.parse(localStorage.getItem(WORKSHEET_COUNTS_KEY) || '{}');
        const worksheetCount = allCounts[userProfile.id] || 0;
        
        const sessionData = { userProfile, isPro, worksheetCount };
        
        // Guardar en caché para acceso rápido (TTL: 5 minutos)
        cacheService.set('session', 'current', sessionData, 5 * 60 * 1000);
        
        return sessionData;

    } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        clearSession(); // Clear corrupted data
        return { userProfile: null, isPro: false, worksheetCount: 0 };
    }
};

/**
 * Saves the user profile and loads their associated data.
 * This should be called upon successful login.
 * @param user The user profile to save.
 * @returns The loaded pro status and worksheet count for the logged-in user.
 */
export const saveSession = (user: UserProfile): { isPro: boolean, worksheetCount: number } => {
    try {
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
        
        // Invalidar caché de sesión actual
        cacheService.delete('session', 'current');
        
        // After saving, reload their specific data
        const { isPro, worksheetCount } = loadSession();
        return { isPro, worksheetCount };
    } catch (e) {
        console.error("Failed to save user profile to localStorage", e);
        return { isPro: false, worksheetCount: 0 };
    }
};

/**
 * Clears all session data from localStorage.
 * This should be called on logout.
 */
export const clearSession = (): void => {
    // We keep pro status and counts, just remove the active user profile
    localStorage.removeItem(USER_PROFILE_KEY);
    
    // Limpiar caché de sesión
    cacheService.delete('session', 'current');
    
    // Also disable Google's one-tap auto-login to allow switching accounts
     if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
    }
};

/**
 * Updates the pro status for a specific user.
 * @param userId The ID of the user to update.
 * @param isPro The new pro status.
 * @returns The new pro status.
 */
export const setUserAsPro = (userId: string, isPro: boolean): boolean => {
    try {
        const allProStatus = JSON.parse(localStorage.getItem(PRO_STATUS_KEY) || '{}');
        allProStatus[userId] = isPro;
        localStorage.setItem(PRO_STATUS_KEY, JSON.stringify(allProStatus));
        
        // Invalidar caché relacionada con este usuario
        cacheService.delete('session', 'current');
        cacheService.delete('subscription_status', userId);
        cacheService.delete('can_generate', userId);
        
        return isPro;
    } catch (e) {
        console.error("Failed to update pro status", e);
        return false;
    }
};

/**
 * Increments the worksheet generation count for a specific user.
 * @param userId The ID of the user.
 * @returns The new count.
 */
export const incrementWorksheetCount = (userId: string): number => {
    try {
        const allCounts = JSON.parse(localStorage.getItem(WORKSHEET_COUNTS_KEY) || '{}');
        const currentCount = allCounts[userId] || 0;
        const newCount = currentCount + 1;
        allCounts[userId] = newCount;
        localStorage.setItem(WORKSHEET_COUNTS_KEY, JSON.stringify(allCounts));
        
        // Invalidar caché relacionada con este usuario
        cacheService.delete('session', 'current');
        cacheService.delete('subscription_status', userId);
        cacheService.delete('can_generate', userId);
        
        return newCount;
    } catch (e) {
        console.error("Failed to increment worksheet count", e);
        return 0;
    }
};
