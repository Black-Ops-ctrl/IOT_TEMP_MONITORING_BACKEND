// src/services/schedulerService.js

class SchedulerService {
    
    constructor() {
        this.isRunning = false;
    }

    getStatus() {
        return {
            running: this.isRunning,
            message: 'Manual trigger only - no automatic timer'
        };
    }
}

module.exports = new SchedulerService();