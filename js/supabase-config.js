// ===== SUPABASE CONFIGURATION =====
// Gen-Z Mocks Platform - Database Connection

const SUPABASE_URL = 'https://reyofyxbyibfprvpkhyt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJleW9meXhieWliZnBydnBraHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODcxNTgsImV4cCI6MjA4MDk2MzE1OH0.x661UTb2feIRJ1vNxboPHFoD0ekucrCckHSL4HwfFb0';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== DATABASE FUNCTIONS =====

// Validate access key against database
async function validateKeyFromDB(key) {
    try {
        const { data, error } = await supabase
            .from('access_keys')
            .select('key, is_active')
            .eq('key', key)
            .eq('is_active', true)
            .single();

        if (error) {
            console.log('Key not found in database, checking local keys...');
            return false;
        }

        return data !== null;
    } catch (err) {
        console.error('Supabase error:', err);
        return false;
    }
}

// Get all mock tests
async function getMockTests(subjectId = null) {
    try {
        let query = supabase
            .from('mock_tests')
            .select(`*, subjects(name_en, icon)`)
            .eq('is_active', true);

        if (subjectId) {
            query = query.eq('subject_id', subjectId);
        }

        const { data, error } = await query;
        return error ? [] : data;
    } catch (err) {
        console.error('Error fetching tests:', err);
        return [];
    }
}

// Get questions for a specific test
async function getQuestions(testId) {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('test_id', testId)
            .order('question_number');

        return error ? [] : data;
    } catch (err) {
        console.error('Error fetching questions:', err);
        return [];
    }
}

// Save test attempt
async function saveTestAttempt(attemptData) {
    try {
        const { data, error } = await supabase
            .from('test_attempts')
            .insert(attemptData);

        return !error;
    } catch (err) {
        console.error('Error saving attempt:', err);
        return false;
    }
}

// Get all subjects
async function getSubjects() {
    try {
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .order('name_en');

        return error ? [] : data;
    } catch (err) {
        console.error('Error fetching subjects:', err);
        return [];
    }
}

// Add new access key (admin function)
async function addAccessKey(key, notes = '') {
    try {
        const { data, error } = await supabase
            .from('access_keys')
            .insert({ key, notes, is_active: true });

        return !error;
    } catch (err) {
        console.error('Error adding key:', err);
        return false;
    }
}

// Get all access keys (admin function)
async function getAllAccessKeys() {
    try {
        const { data, error } = await supabase
            .from('access_keys')
            .select('*')
            .order('created_at', { ascending: false });

        return error ? [] : data;
    } catch (err) {
        console.error('Error fetching keys:', err);
        return [];
    }
}

console.log('✅ Supabase connected:', SUPABASE_URL);
