import { UserProfile } from '../types';

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
 */
export const loadSession = (): SessionData => {
    try {
        const savedUser = localStorage.getItem(USER_PROFILE_KEY);
        if (!savedUser) return { userProfile: null, isPro: false, worksheetCount: 0 };

        const userProfile: UserProfile = JSON.parse(savedUser);
        
        const allProStatus = JSON.parse(localStorage.getItem(PRO_STATUS_KEY) || '{}');
        const isPro = allProStatus[userProfile.id] || false;

        const allCounts = JSON.parse(localStorage.getItem(WORKSHEET_COUNTS_KEY) || '{}');
        const worksheetCount = allCounts[userProfile.id] || 0;
        
        return { userProfile, isPro, worksheetCount };

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
        return newCount;
    } catch (e) {
        console.error("Failed to increment worksheet count", e);
        return 0;
    }
};
