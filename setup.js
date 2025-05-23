// setup.js - Script to set up the frontend files
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('✅ Created public directory');
}

// Function to copy frontend files
function setupFrontend(sourcePath) {
  try {
    // Check if the source path exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source path "${sourcePath}" does not exist`);
      return false;
    }

    // Check if the source path is a directory
    const stats = fs.statSync(sourcePath);
    if (!stats.isDirectory()) {
      console.error(`❌ Source path "${sourcePath}" is not a directory`);
      return false;
    }

    // Copy required files
    const requiredFiles = ['index.html', 'script.js', 'styles.css'];
    let allFilesFound = true;

    requiredFiles.forEach(file => {
      const sourceFile = path.join(sourcePath, file);
      const destFile = path.join(publicDir, file);

      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, destFile);
        console.log(`✅ Copied ${file} to public directory`);
      } else {
        console.error(`❌ File "${file}" not found in source directory`);
        allFilesFound = false;
      }
    });

    if (!allFilesFound) {
      console.warn('⚠️ Some files were not found. The frontend might not work properly.');
    }

    return allFilesFound;
  } catch (error) {
    console.error('❌ Error setting up frontend:', error.message);
    return false;
  }
}

// Main execution
console.log('🚀 Setting up the frontend files...');

// Check if a source path is provided as an argument
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('ℹ️ No source path provided. Please specify the path to your frontend files:');
  console.log('   node setup.js /path/to/your/frontend');
  process.exit(1);
}

const sourcePath = args[0];
const success = setupFrontend(sourcePath);

if (success) {
  console.log('🎉 Frontend setup complete!');
  console.log('🔧 Installing dependencies...');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('🎉 Dependencies installed!');
    console.log('🚀 Run the server with: npm run dev');
  } catch (error) {
    console.error('❌ Error installing dependencies. Please run npm install manually.');
  }
} else {
  console.error('❌ Frontend setup failed. Please check the errors above.');
}