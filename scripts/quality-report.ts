#!/usr/bin/env ts-node
/**
 * Script de rapport de qualité du code
 * Analyse les principaux indicateurs de qualité
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface QualityMetrics {
  totalFiles: number;
  tsFiles: number;
  anyCount: number;
  eslintErrors: number;
  eslintWarnings: number;
  testFiles: number;
  testCoverage: string;
  score: number;
}

function countLinesInFile(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

function countAnyTypes(directory: string): number {
  try {
    const output = execSync(
      `grep -r " as any|: any" ${directory} --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l`,
      { encoding: 'utf-8' }
    );
    return parseInt(output.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function getFileStats(directory: string): { total: number; tsFiles: number } {
  let total = 0;
  let tsFiles = 0;
  
  function walk(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
        walk(fullPath);
      } else if (stat.isFile()) {
        total++;
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          tsFiles++;
        }
      }
    }
  }
  
  try {
    walk(directory);
  } catch {
    // Ignore errors
  }
  
  return { total, tsFiles };
}

function generateQualityReport(): QualityMetrics {
  const srcDir = path.join(process.cwd(), 'src');
  
  // Count files
  const fileStats = getFileStats(srcDir);
  
  // Count any types
  const anyCount = countAnyTypes(srcDir);
  
  // Calculate score (out of 100)
  // Base score: 70
  // - Remove 1 point per 5 any types
  // - Add 5 points for TypeScript strict mode
  // - Add 5 points for having tests
  let score = 70;
  score -= Math.floor(anyCount / 5);
  
  // Check if strict mode is enabled
  try {
    const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf-8'));
    if (tsConfig.compilerOptions?.strict) {
      score += 5;
    }
  } catch {
    // Ignore
  }
  
  // Check for tests
  const testFiles = getFileStats(path.join(process.cwd(), '__tests__')).tsFiles +
                    getFileStats(path.join(process.cwd(), 'tests')).tsFiles;
  if (testFiles > 0) {
    score += 5;
  }
  
  // Cap score between 0 and 100
  score = Math.max(0, Math.min(100, score));
  
  return {
    totalFiles: fileStats.total,
    tsFiles: fileStats.tsFiles,
    anyCount,
    eslintErrors: 0, // Would need ESLint API
    eslintWarnings: 0,
    testFiles,
    testCoverage: 'N/A',
    score,
  };
}

function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        RAPPORT DE QUALITÉ DU CODE - FleetMaster        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log();
  
  const metrics = generateQualityReport();
  
  console.log('📊 Métriques:');
  console.log(`   • Fichiers TypeScript: ${metrics.tsFiles}`);
  console.log(`   • Types 'any' restants: ${metrics.anyCount}`);
  console.log(`   • Fichiers de test: ${metrics.testFiles}`);
  console.log();
  
  console.log('📈 Score de qualité:');
  const bar = '█'.repeat(metrics.score / 5) + '░'.repeat(20 - metrics.score / 5);
  console.log(`   [${bar}] ${metrics.score}/100`);
  console.log();
  
  // Quality grade
  let grade = 'F';
  let color = '\x1b[31m'; // Red
  
  if (metrics.score >= 90) {
    grade = 'A+';
    color = '\x1b[32m'; // Green
  } else if (metrics.score >= 80) {
    grade = 'A';
    color = '\x1b[32m';
  } else if (metrics.score >= 70) {
    grade = 'B';
    color = '\x1b[33m'; // Yellow
  } else if (metrics.score >= 60) {
    grade = 'C';
    color = '\x1b[33m';
  } else if (metrics.score >= 50) {
    grade = 'D';
    color = '\x1b[31m';
  }
  
  console.log(`${color}   Note: ${grade}\x1b[0m`);
  console.log();
  
  // Recommendations
  console.log('💡 Recommandations:');
  if (metrics.anyCount > 50) {
    console.log(`   • Remplacer ${metrics.anyCount} types 'any' par des types spécifiques`);
  }
  if (metrics.testFiles < 10) {
    console.log('   • Ajouter plus de tests unitaires');
  }
  
  // Target
  console.log();
  console.log('🎯 Objectif: Atteindre 85/100');
  console.log(`   Progression: ${Math.round((metrics.score / 85) * 100)}%`);
  
  process.exit(metrics.score >= 85 ? 0 : 1);
}

main();
