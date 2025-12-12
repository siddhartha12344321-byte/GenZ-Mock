/**
 * Firebase Sync Module for GenZ-Mock
 * Handles real-time sync of keys, tests, and questions with Firebase
 */

const FIREBASE_URL = 'https://genzmocks-default-rtdb.firebaseio.com';

const FirebaseSync = {
    // ==================== ACCESS KEYS ====================

    /**
     * Save a new access key to Firebase
     */
    async saveKey(keyData) {
        try {
            const response = await fetch(`${FIREBASE_URL}/access_keys/${keyData.id}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(keyData)
            });
            return response.ok;
        } catch (e) {
            console.error('Firebase saveKey error:', e);
            return false;
        }
    },

    /**
     * Get all access keys from Firebase
     */
    async getAllKeys() {
        try {
            const response = await fetch(`${FIREBASE_URL}/access_keys.json`);
            const data = await response.json();
            if (!data) return [];
            return Object.values(data);
        } catch (e) {
            console.error('Firebase getAllKeys error:', e);
            return [];
        }
    },

    /**
     * Validate if a key exists and is active
     */
    async validateKey(keyCode) {
        try {
            const keys = await this.getAllKeys();
            const key = keys.find(k => k.key === keyCode && k.is_active !== false);
            return key !== undefined;
        } catch (e) {
            console.error('Firebase validateKey error:', e);
            return false;
        }
    },

    /**
     * Delete a key from Firebase
     */
    async deleteKey(keyId) {
        try {
            const response = await fetch(`${FIREBASE_URL}/access_keys/${keyId}.json`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (e) {
            console.error('Firebase deleteKey error:', e);
            return false;
        }
    },

    // ==================== MOCK TESTS ====================

    /**
     * Save a mock test to Firebase
     */
    async saveTest(testData) {
        try {
            const response = await fetch(`${FIREBASE_URL}/mock_tests/${testData.id}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });
            return response.ok;
        } catch (e) {
            console.error('Firebase saveTest error:', e);
            return false;
        }
    },

    /**
     * Get all mock tests from Firebase
     */
    async getAllTests() {
        try {
            const response = await fetch(`${FIREBASE_URL}/mock_tests.json`);
            const data = await response.json();
            if (!data) return [];
            return Object.values(data);
        } catch (e) {
            console.error('Firebase getAllTests error:', e);
            return [];
        }
    },

    /**
     * Delete a test from Firebase
     */
    async deleteTest(testId) {
        try {
            // Delete test
            await fetch(`${FIREBASE_URL}/mock_tests/${testId}.json`, { method: 'DELETE' });
            // Delete associated questions
            await fetch(`${FIREBASE_URL}/questions/${testId}.json`, { method: 'DELETE' });
            return true;
        } catch (e) {
            console.error('Firebase deleteTest error:', e);
            return false;
        }
    },

    // ==================== QUESTIONS ====================

    /**
     * Save questions for a test
     */
    async saveQuestions(testId, questions) {
        try {
            const questionsObj = {};
            questions.forEach((q, idx) => {
                questionsObj[q.id || `q${idx + 1}`] = q;
            });

            const response = await fetch(`${FIREBASE_URL}/questions/${testId}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(questionsObj)
            });
            return response.ok;
        } catch (e) {
            console.error('Firebase saveQuestions error:', e);
            return false;
        }
    },

    /**
     * Get questions for a specific test
     */
    async getQuestionsByTestId(testId) {
        try {
            const response = await fetch(`${FIREBASE_URL}/questions/${testId}.json`);
            const data = await response.json();
            if (!data) return [];
            return Object.values(data);
        } catch (e) {
            console.error('Firebase getQuestionsByTestId error:', e);
            return [];
        }
    },

    /**
     * Get all questions from Firebase
     */
    async getAllQuestions() {
        try {
            const response = await fetch(`${FIREBASE_URL}/questions.json`);
            const data = await response.json();
            if (!data) return [];

            // Flatten the nested structure
            let allQuestions = [];
            Object.keys(data).forEach(testId => {
                const testQuestions = Object.values(data[testId]);
                allQuestions = allQuestions.concat(testQuestions);
            });
            return allQuestions;
        } catch (e) {
            console.error('Firebase getAllQuestions error:', e);
            return [];
        }
    },

    // ==================== TEST RESULTS & LEADERBOARD ====================

    /**
     * Save a user's test result
     * @param {string} testId - The test ID
     * @param {object} resultData - { userName, userKey, score, correct, wrong, total, timeTaken, accuracy }
     */
    async saveTestResult(testId, resultData) {
        try {
            const resultId = `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const result = {
                id: resultId,
                testId: testId,
                userName: resultData.userName || 'Anonymous',
                userKey: resultData.userKey || '',
                correct: resultData.correct || 0,
                wrong: resultData.wrong || 0,
                total: resultData.total || 0,
                score: resultData.score || 0,
                accuracy: resultData.accuracy || 0,
                timeTaken: resultData.timeTaken || 0,
                timestamp: new Date().toISOString()
            };

            const response = await fetch(`${FIREBASE_URL}/results/${testId}/${resultId}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result)
            });

            if (response.ok) {
                console.log('📊 Test result saved to Firebase');
            }
            return response.ok ? result : null;
        } catch (e) {
            console.error('Firebase saveTestResult error:', e);
            return null;
        }
    },

    /**
     * Get leaderboard for a specific test
     * @param {string} testId - The test ID
     * @returns {Array} Sorted array of results (highest score first)
     */
    async getTestLeaderboard(testId) {
        try {
            const response = await fetch(`${FIREBASE_URL}/results/${testId}.json`);
            const data = await response.json();
            if (!data) return [];

            // Convert to array and sort by score (descending), then by time (ascending)
            const results = Object.values(data);
            results.sort((a, b) => {
                // First sort by correct answers (descending)
                if (b.correct !== a.correct) return b.correct - a.correct;
                // Then by time taken (ascending - faster is better)
                return a.timeTaken - b.timeTaken;
            });

            // Add rank
            return results.map((r, idx) => ({ ...r, rank: idx + 1 }));
        } catch (e) {
            console.error('Firebase getTestLeaderboard error:', e);
            return [];
        }
    },

    /**
     * Get all results across all tests (for admin analytics)
     * @returns {Object} Object with testId as key and array of results as value
     */
    async getAllResults() {
        try {
            const response = await fetch(`${FIREBASE_URL}/results.json`);
            const data = await response.json();
            if (!data) return {};
            return data;
        } catch (e) {
            console.error('Firebase getAllResults error:', e);
            return {};
        }
    },

    /**
     * Get analytics summary for admin
     * @returns {Object} { totalAttempts, testStats: { testId: { attempts, avgScore, topScore } } }
     */
    async getAnalyticsSummary() {
        try {
            const allResults = await this.getAllResults();
            let totalAttempts = 0;
            const testStats = {};

            for (const testId in allResults) {
                const results = Object.values(allResults[testId]);
                totalAttempts += results.length;

                const scores = results.map(r => r.correct / r.total * 100);
                testStats[testId] = {
                    attempts: results.length,
                    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
                    topScore: Math.max(...scores),
                    results: results.sort((a, b) => b.correct - a.correct)
                };
            }

            return { totalAttempts, testStats };
        } catch (e) {
            console.error('Firebase getAnalyticsSummary error:', e);
            return { totalAttempts: 0, testStats: {} };
        }
    },

    // ==================== NOTIFICATIONS ====================

    /**
     * Save a notification to Firebase
     * @param {Object} notification - { id, title, message, type, link, created_at, expires_at, is_active }
     */
    async saveNotification(notification) {
        try {
            const response = await fetch(`${FIREBASE_URL}/notifications/${notification.id}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notification)
            });
            if (response.ok) {
                console.log('📢 Notification saved to Firebase');
            }
            return response.ok;
        } catch (e) {
            console.error('Firebase saveNotification error:', e);
            return false;
        }
    },

    /**
     * Get all notifications from Firebase
     * @returns {Array} Array of notification objects
     */
    async getAllNotifications() {
        try {
            const response = await fetch(`${FIREBASE_URL}/notifications.json`);
            const data = await response.json();
            if (!data) return [];
            return Object.values(data);
        } catch (e) {
            console.error('Firebase getAllNotifications error:', e);
            return [];
        }
    },

    /**
     * Get active (non-expired) notifications for students
     * @returns {Array} Array of active notification objects
     */
    async getActiveNotifications() {
        try {
            const all = await this.getAllNotifications();
            const now = new Date();
            return all.filter(n => {
                if (!n.is_active) return false;
                if (n.expires_at && new Date(n.expires_at) < now) return false;
                return true;
            }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } catch (e) {
            console.error('Firebase getActiveNotifications error:', e);
            return [];
        }
    },

    /**
     * Delete a notification from Firebase
     * @param {string} id - Notification ID
     */
    async deleteNotification(id) {
        try {
            const response = await fetch(`${FIREBASE_URL}/notifications/${id}.json`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (e) {
            console.error('Firebase deleteNotification error:', e);
            return false;
        }
    },

    // ==================== CURRENT AFFAIRS ====================

    /**
     * Save current affairs articles for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {Array} articles - Array of article objects
     */
    async saveCurrentAffairs(date, articles) {
        try {
            const data = {
                date: date,
                updated_at: new Date().toISOString(),
                total_articles: articles.length,
                articles: articles
            };

            const response = await fetch(`${FIREBASE_URL}/current_affairs/${date.replace(/-/g, '')}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                console.log(`📰 Current affairs saved for ${date}`);
            }
            return response.ok;
        } catch (e) {
            console.error('Firebase saveCurrentAffairs error:', e);
            return false;
        }
    },

    /**
     * Get current affairs for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Object} { date, articles: [...] }
     */
    async getCurrentAffairs(date) {
        try {
            const dateKey = date.replace(/-/g, '');
            const response = await fetch(`${FIREBASE_URL}/current_affairs/${dateKey}.json`);
            const data = await response.json();
            return data || { date: date, articles: [] };
        } catch (e) {
            console.error('Firebase getCurrentAffairs error:', e);
            return { date: date, articles: [] };
        }
    },

    /**
     * Get current affairs for the past N days
     * @param {number} days - Number of days to fetch (default 7)
     * @returns {Array} Array of daily current affairs objects
     */
    async getWeeklyCurrentAffairs(days = 7) {
        try {
            const results = [];
            const today = new Date();

            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const data = await this.getCurrentAffairs(dateStr);
                if (data && data.articles && data.articles.length > 0) {
                    results.push(data);
                }
            }

            return results;
        } catch (e) {
            console.error('Firebase getWeeklyCurrentAffairs error:', e);
            return [];
        }
    },

    // ==================== INITIAL DATA SYNC ====================

    /**
     * Sync default test to Firebase if not exists
     */
    async initDefaultData() {
        try {
            // Check if any tests exist
            const tests = await this.getAllTests();
            if (tests.length > 0) {
                console.log('📦 Firebase has existing data, skipping init');
                return;
            }

            console.log('📦 Initializing default data in Firebase...');

            // Add default keys
            const defaultKeys = ['GenZTesting1', 'GenZTesting2', 'GenZTesting3', 'GenZTesting4', 'GenZTesting5'];
            for (const keyCode of defaultKeys) {
                await this.saveKey({
                    id: `key_${keyCode}`,
                    key: keyCode,
                    created_at: new Date().toISOString(),
                    is_active: true
                });
            }
            console.log('🔑 Default keys added to Firebase');

        } catch (e) {
            console.error('Firebase initDefaultData error:', e);
        }
    }
};

// Make it available globally
window.FirebaseSync = FirebaseSync;

console.log('🔥 Firebase Sync module loaded');
