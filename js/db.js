/**
 * IndexedDB Database Wrapper for Kayel App
 * Replaces MySQL with browser-based storage
 * Works completely offline
 */

class KayelDB {
    constructor() {
        this.dbName = 'kayel_db';
        this.version = 1;
        this.db = null;
    }

    /**
     * Initialize database
     */
    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ Database opened successfully');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('🔧 Upgrading database...');
                
                // Create Groups store
                if (!db.objectStoreNames.contains('groups')) {
                    const groupStore = db.createObjectStore('groups', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    groupStore.createIndex('name', 'name', { unique: true });
                    console.log('✅ Groups store created');
                }
                
                // Create Students store
                if (!db.objectStoreNames.contains('students')) {
                    const studentStore = db.createObjectStore('students', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    studentStore.createIndex('group_id', 'group_id', { unique: false });
                    studentStore.createIndex('name', 'name', { unique: false });
                    console.log('✅ Students store created');
                }
                
                // Create Attendance store
                if (!db.objectStoreNames.contains('attendance')) {
                    const attendanceStore = db.createObjectStore('attendance', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    attendanceStore.createIndex('student_id', 'student_id', { unique: false });
                    attendanceStore.createIndex('date', 'date', { unique: false });
                    console.log('✅ Attendance store created');
                }
            };
        });
    }

    // ==================== GROUP OPERATIONS ====================

    /**
     * Add a new group
     */
    async addGroup(name) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['groups'], 'readwrite');
            const store = transaction.objectStore('groups');
            
            const group = {
                name: name,
                created_at: new Date().toISOString()
            };
            
            const request = store.add(group);
            
            request.onsuccess = () => {
                console.log('✅ Group added:', name);
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('❌ Error adding group:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get all groups
     */
    async getAllGroups() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['groups'], 'readonly');
            const store = transaction.objectStore('groups');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get group by ID
     */
    async getGroup(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['groups'], 'readonly');
            const store = transaction.objectStore('groups');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete group
     */
    async deleteGroup(id) {
        const db = await this.init();
        
        // First delete all students in this group
        await this.deleteStudentsByGroup(id);
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['groups'], 'readwrite');
            const store = transaction.objectStore('groups');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('✅ Group deleted:', id);
                resolve();
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // ==================== STUDENT OPERATIONS ====================

    /**
     * Add a new student
     */
    async addStudent(name, groupId, seance = 1) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['students'], 'readwrite');
            const store = transaction.objectStore('students');
            
            const student = {
                name: name,
                group_id: parseInt(groupId),
                seance: parseInt(seance),
                created_at: new Date().toISOString()
            };
            
            const request = store.add(student);
            
            request.onsuccess = () => {
                console.log('✅ Student added:', name);
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('❌ Error adding student:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get all students
     */
    async getAllStudents() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['students'], 'readonly');
            const store = transaction.objectStore('students');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get students by group
     */
    async getStudentsByGroup(groupId) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['students'], 'readonly');
            const store = transaction.objectStore('students');
            const index = store.index('group_id');
            const request = index.getAll(parseInt(groupId));
            
            request.onsuccess = () => {
                const students = request.result.sort((a, b) => 
                    a.name.localeCompare(b.name, 'ar')
                );
                resolve(students);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update student seance
     */
    async updateStudentSeance(studentId, seanceChange) {
        const db = await this.init();
        return new Promise(async (resolve, reject) => {
            const transaction = db.transaction(['students'], 'readwrite');
            const store = transaction.objectStore('students');
            const getRequest = store.get(parseInt(studentId));
            
            getRequest.onsuccess = () => {
                const student = getRequest.result;
                if (student) {
                    student.seance += seanceChange;
                    const updateRequest = store.put(student);
                    
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Student not found'));
                }
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Delete student
     */
    async deleteStudent(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['students'], 'readwrite');
            const store = transaction.objectStore('students');
            const request = store.delete(parseInt(id));
            
            request.onsuccess = () => {
                console.log('✅ Student deleted:', id);
                resolve();
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete all students in a group
     */
    async deleteStudentsByGroup(groupId) {
        const students = await this.getStudentsByGroup(groupId);
        const promises = students.map(student => this.deleteStudent(student.id));
        return Promise.all(promises);
    }

    // ==================== ATTENDANCE OPERATIONS ====================

    /**
     * Mark attendance
     */
    async markAttendance(studentId, date, present) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['attendance'], 'readwrite');
            const store = transaction.objectStore('attendance');
            
            const record = {
                student_id: parseInt(studentId),
                date: date,
                present: present ? 1 : 0,
                created_at: new Date().toISOString()
            };
            
            const request = store.add(record);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get attendance for a student
     */
    async getStudentAttendance(studentId) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['attendance'], 'readonly');
            const store = transaction.objectStore('attendance');
            const index = store.index('student_id');
            const request = index.getAll(parseInt(studentId));
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ==================== UTILITY OPERATIONS ====================

    /**
     * Clear all data (for testing)
     */
    async clearAllData() {
        const db = await this.init();
        const stores = ['groups', 'students', 'attendance'];
        
        return Promise.all(stores.map(storeName => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log(`✅ Cleared ${storeName}`);
                    resolve();
                };
                request.onerror = () => reject(request.error);
            });
        }));
    }

    /**
     * Export all data to JSON
     */
    async exportData() {
        const groups = await this.getAllGroups();
        const students = await this.getAllStudents();
        
        return {
            version: 1,
            exported_at: new Date().toISOString(),
            groups: groups,
            students: students
        };
    }

    /**
     * Import data from JSON
     */
    async importData(data) {
        await this.clearAllData();
        
        // Import groups
        for (const group of data.groups) {
            await this.addGroup(group.name);
        }
        
        // Import students
        for (const student of data.students) {
            await this.addStudent(student.name, student.group_id, student.seance);
        }
        
        console.log('✅ Data imported successfully');
    }
}

// Create global instance
const db = new KayelDB();

// Initialize on load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await db.init();
        console.log('✅ Kayel Database ready!');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
    }
});
