"use strict";
// Migration CLI - Command line interface for managing API migration
// Usage: node migration-cli.js [command] [options]
Object.defineProperty(exports, "__esModule", { value: true });
exports.commands = void 0;
exports.runCli = runCli;
const migration_flags_1 = require("./migration-flags");
const commands = [
    {
        name: 'status',
        description: 'Show current migration status',
        handler: () => {
            const flags = (0, migration_flags_1.getMigrationFlags)();
            console.log('🔍 Current Migration Status:');
            console.log('================================');
            console.log(`Use Generated Client: ${flags.useGeneratedClient}`);
            console.log(`Shadow Validation: ${flags.enableShadowValidation}`);
            console.log(`Emergency Fallback: ${flags.emergencyFallback}`);
            console.log('');
            console.log('Operation Flags:');
            console.log(`  GET: ${flags.useGeneratedForGET}`);
            console.log(`  POST: ${flags.useGeneratedForPOST}`);
            console.log(`  PUT: ${flags.useGeneratedForPUT}`);
            console.log(`  DELETE: ${flags.useGeneratedForDELETE}`);
            console.log('');
            console.log('Entity Flags:');
            console.log(`  Patients: ${flags.useGeneratedForPatients}`);
            console.log(`  Appointments: ${flags.useGeneratedForAppointments}`);
            console.log(`  Devices: ${flags.useGeneratedForDevices}`);
            console.log(`  Patient Notes: ${flags.useGeneratedForPatientNotes}`);
            console.log(`  SGK: ${flags.useGeneratedForSGK}`);
            console.log(`  Uploads: ${flags.useGeneratedForUploads}`);
        }
    },
    {
        name: 'phases',
        description: 'List all available migration phases',
        handler: () => {
            console.log('📋 Available Migration Phases:');
            console.log('===============================');
            Object.entries(migration_flags_1.MIGRATION_PHASES).forEach(([key, phase]) => {
                console.log(`${key}: ${phase.description}`);
            });
        }
    },
    {
        name: 'set-phase',
        description: 'Set migration phase (e.g., set-phase PHASE_1_GET_PATIENTS)',
        handler: (args) => {
            const phaseName = args[0];
            if (!phaseName) {
                console.error('❌ Error: Phase name required');
                console.log('Usage: set-phase <PHASE_NAME>');
                console.log('Available phases:');
                Object.keys(migration_flags_1.MIGRATION_PHASES).forEach(key => {
                    console.log(`  ${key}`);
                });
                return;
            }
            if (!(phaseName in migration_flags_1.MIGRATION_PHASES)) {
                console.error(`❌ Error: Unknown phase "${phaseName}"`);
                return;
            }
            try {
                (0, migration_flags_1.setMigrationPhase)(phaseName);
                console.log(`✅ Successfully set migration phase to: ${phaseName}`);
                console.log(`Description: ${migration_flags_1.MIGRATION_PHASES[phaseName].description}`);
            }
            catch (error) {
                console.error('❌ Error setting migration phase:', error);
            }
        }
    },
    {
        name: 'rollback',
        description: 'Emergency rollback - disable all generated client features',
        handler: () => {
            try {
                (0, migration_flags_1.emergencyRollback)();
                console.log('🚨 Emergency rollback completed');
                console.log('All generated client features have been disabled');
            }
            catch (error) {
                console.error('❌ Error during rollback:', error);
            }
        }
    },
    {
        name: 'help',
        description: 'Show this help message',
        handler: () => {
            console.log('🚀 API Migration CLI');
            console.log('====================');
            console.log('');
            console.log('Available commands:');
            commands.forEach(cmd => {
                console.log(`  ${cmd.name.padEnd(12)} - ${cmd.description}`);
            });
            console.log('');
            console.log('Examples:');
            console.log('  node migration-cli.js status');
            console.log('  node migration-cli.js set-phase PHASE_1_GET_PATIENTS');
            console.log('  node migration-cli.js rollback');
        }
    }
];
exports.commands = commands;
function runCli() {
    const args = process.argv.slice(2);
    const commandName = args[0];
    if (!commandName) {
        commands.find(cmd => cmd.name === 'help')?.handler([]);
        return;
    }
    const command = commands.find(cmd => cmd.name === commandName);
    if (!command) {
        console.error(`❌ Unknown command: ${commandName}`);
        console.log('Run "help" to see available commands');
        return;
    }
    command.handler(args.slice(1));
}
// Run CLI if this file is executed directly
if (require.main === module) {
    runCli();
}
