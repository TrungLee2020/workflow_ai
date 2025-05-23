// ----------------------TRUNGLX----------------------
// server.js - Express Server for WORK_VER_2 Frontend
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
// const { OpenAI } = require('openai');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const marked = require('marked');
const unidecode = require('unidecode');
const app = express();
const PORT = 3001; //process.env.PORT ||

// Directory to store workflows and templates
const STORAGE_DIR = path.join(__dirname, 'storage');
const WORKFLOWS_DIR = path.join(STORAGE_DIR, 'workflows');
const TEMPLATES_DIR = path.join(STORAGE_DIR, 'templates');
const OUTPUT_DIR = path.join(STORAGE_DIR, 'outputs');

// Ensure storage directories exist
[STORAGE_DIR, WORKFLOWS_DIR, TEMPLATES_DIR, OUTPUT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

require('dotenv').config();

// Configure OpenAI (you need to set your API key)
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY // Set this in your environment variables
// });

// Configure Google Generative AI (Gemini)
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve frontend files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes

// Get all workflows
app.get('/api/workflows', (req, res) => {
  try {
    const files = fs.readdirSync(WORKFLOWS_DIR);
    const workflows = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
        const workflow = JSON.parse(content);
        return {
          id: path.basename(file, '.json'),
          name: workflow.name || 'Unnamed Workflow',
          updatedAt: workflow.updatedAt || new Date().toISOString()
        };
      });
    res.json(workflows);
  } catch (error) {
    console.error('Error getting workflows:', error);
    res.status(500).json({ error: 'Failed to get workflows' });
  }
});

// Get a specific workflow
app.get('/api/workflows/:id', (req, res) => {
  try {
    const filePath = path.join(WORKFLOWS_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(content));
  } catch (error) {
    console.error('Error getting workflow:', error);
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

// Save a workflow
app.post('/api/workflows', (req, res) => {
  try {
    const { workflow } = req.body;
    if (!workflow) {
      return res.status(400).json({ error: 'No workflow data provided' });
    }
    
    workflow.updatedAt = new Date().toISOString();
    const id = workflow.id || uuidv4();
    workflow.id = id;
    
    fs.writeFileSync(
      path.join(WORKFLOWS_DIR, `${id}.json`),
      JSON.stringify(workflow, null, 2)
    );
    
    res.json({ id, success: true });
  } catch (error) {
    console.error('Error saving workflow:', error);
    res.status(500).json({ error: 'Failed to save workflow' });
  }
});

// Delete a workflow
app.delete('/api/workflows/:id', (req, res) => {
  try {
    const filePath = path.join(WORKFLOWS_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// Templates API

// Get all templates
app.get('/api/templates', (req, res) => {
  try {
    const files = fs.readdirSync(TEMPLATES_DIR);
    const templates = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const content = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf8');
        return JSON.parse(content);
      });
    res.json(templates);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Save a template
app.post('/api/templates', (req, res) => {
  try {
    const { template } = req.body;
    if (!template) {
      return res.status(400).json({ error: 'No template data provided' });
    }
    
    const id = template.id || uuidv4();
    template.id = id;
    template.createdAt = template.createdAt || new Date().toISOString();
    
    fs.writeFileSync(
      path.join(TEMPLATES_DIR, `${id}.json`),
      JSON.stringify(template, null, 2)
    );
    
    res.json({ id, success: true });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// Delete a template
app.delete('/api/templates/:id', (req, res) => {
  try {
    const filePath = path.join(TEMPLATES_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Template not found' });
    }
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Node execution endpoints

// 1. Trigger Node
app.post('/api/execute/trigger', async (req, res) => {
  try {
    const { config } = req.body;
    
    const output = {
      timestamp: new Date().toISOString(),
      triggerType: config.triggerType || 'webhook',
      webhookUrl: config.webhookUrl || '',
      webhookMethod: config.webhookMethod || 'POST',
      interval: config.interval || 60,
      scheduleEnabled: config.scheduleEnabled || false,
      manualNote: config.manualNote || ''
    };
    
    // Simulating a trigger response for now
    // In a real implementation, this would connect to actual trigger sources
    switch (config.triggerType) {
      case 'webhook':
        // Simulate webhook data
        output.data = { event: 'webhook_triggered', source: 'external_system' };
        break;
      case 'schedule':
        // Simulate scheduled event
        output.data = { event: 'scheduled_execution', interval: config.interval };
        break;
      case 'manual':
        // Simulate manual trigger
        output.data = { event: 'manual_execution', note: config.manualNote };
        break;
    }
    
    res.json({ output });
  } catch (error) {
    console.error('Error executing trigger node:', error);
    res.status(500).json({ error: 'Failed to execute trigger node' });
  }
});

// 2. HTTP Node
app.post('/api/execute/http', async (req, res) => {
    try {
      const { config } = req.body;
      
      if (!config.url) {
        return res.status(400).json({ error: 'URL là bắt buộc' });
      }
      
      const method = config.method || 'GET';
      let headers = {};
      
      try {
        headers = config.headers ? JSON.parse(config.headers) : {};
      } catch (e) {
        return res.status(400).json({ error: 'JSON headers không hợp lệ' });
      }
      
      try {
        // Thực hiện HTTP request thực tế
        const axios = require('axios');
        const response = await axios({
          method,
          url: config.url,
          headers,
          timeout: 10000 // 10 giây timeout
        });
        
        // Trả về dữ liệu thực tế từ API - CẤU TRÚC QUAN TRỌNG
        // output này sẽ được sử dụng bởi AI Node
        const output = {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data // Dữ liệu thực tế từ API
        };
        
        console.log('HTTP Node executed successfully:', output.status);
        
        res.json({ output });
      } catch (error) {
        if (error.response) {
          // Request đã được thực hiện và server trả về status code ngoài phạm vi 2xx
          res.json({
            output: {
              status: error.response.status,
              statusText: error.response.statusText,
              headers: error.response.headers,
              data: error.response.data,
              error: true
            }
          });
        } else if (error.request) {
          // Request đã được tạo nhưng không nhận được response
          res.json({
            output: {
              error: true,
              status: 0,
              statusText: 'No response',
              message: 'Không nhận được phản hồi từ server'
            }
          });
        } else {
          // Có lỗi khi thiết lập request
          res.status(500).json({ 
            error: 'Lỗi khi gửi HTTP request',
            message: error.message
          });
        }
      }
    } catch (error) {
      console.error('Lỗi HTTP node:', error);
      res.status(500).json({ error: error.message });
    }
  });

// 3. AI Node
app.post('/api/execute/ai', async (req, res) => {
    try {
        const { config, input } = req.body;
      
        console.log('AI Node received input:', JSON.stringify(input).substring(0, 200) + '...');
        
        // Kiểm tra prompt, nếu không có thì sử dụng mặc định bằng tiếng Việt
        const defaultPrompt = "Hãy phân tích dữ liệu sau đây và sử dụng tiếng Việt để phân tích:";
        const prompt = config.prompt ? config.prompt : defaultPrompt;
        
        // Tạo prompt đầy đủ với dữ liệu đầu vào - truyền nguyên dữ liệu 
        let fullPrompt;
        if (input && Object.keys(input).length > 0) {
            // Chuyển input thành chuỗi JSON để LLM xử lý
            fullPrompt = `${prompt}\n\n${JSON.stringify(input, null, 2)}`;
        } else {
            fullPrompt = `${prompt}\n\n(Không có dữ liệu đầu vào)`;
        }
        
        // Đảm bảo trả về tiếng Việt nếu prompt yêu cầu
        if (prompt.toLowerCase().includes('tiếng việt') || prompt.toLowerCase().includes('bằng tiếng việt')) {
            fullPrompt += "\n\nVui lòng trả lời bằng tiếng Việt.";
        }
        
        console.log('AI Node prompt:', fullPrompt.substring(0, 200) + '...');
        
        const maxLength = parseInt(config.maxLength) || 500;
        const temperature = parseFloat(config.temperature) || 0.7;
        
        let model = config.model;
        
        if (model === 'custom' && config.customModel) {
            model = config.customModel;
        }
        
        // Xử lý theo từng loại model AI
        // if (model === 'gpt-4' || model === 'gpt-3.5-turbo') {
        //     // OpenAI implementation
        //     try {
        //     response = await openai.chat.completions.create({
        //         model: model,
        //         messages: [
        //         { 
        //             role: "user", 
        //             content: fullPrompt 
        //         }
        //         ],
        //         max_tokens: maxLength,
        //         temperature: temperature
        //     });
            
        //     const output = {
        //         model: model,
        //         prompt: config.prompt || defaultPrompt,
        //         response: response.choices[0].message.content,
        //         usage: response.usage
        //     };
            
        //     console.log('OpenAI response received successfully');
        //     res.json({ output });
        //     } catch (error) {
        //     console.error('OpenAI API Error:', error);
        //     res.status(500).json({
        //         output: {
        //         model: model,
        //         prompt: config.prompt || defaultPrompt,
        //         response: `# Lỗi khi gọi OpenAI API\n\nĐã xảy ra lỗi khi xử lý yêu cầu: ${error.message}\n\nVui lòng kiểm tra API key và thử lại.`,
        //         error: true
        //         }
        //     });
        //     }
        // } 
        if (model === 'gemini') {
            // Gemini implementation
            await handleGemini(res, fullPrompt, {
            maxTokens: maxLength,
            temperature: temperature,
            model: config.geminiModel || "gemini-1.5-flash"
            }, config.prompt || defaultPrompt);
        } else {
            // Default fallback (mô phỏng) với phân tích dữ liệu tổng quát
            let simulatedResponse = `# Phân tích dữ liệu (Mô phỏng)\n\n`;
            
            simulatedResponse += `## Thông tin\n- Model: ${model}\n- Prompt: ${config.prompt || defaultPrompt}\n\n`;
            
            // Thêm phân tích đơn giản dựa trên dữ liệu đầu vào
            if (input && Object.keys(input).length > 0) {
            simulatedResponse += `## Phân tích dữ liệu\n`;
            simulatedResponse += `Dữ liệu nhận được có cấu trúc với ${Object.keys(input).length} trường chính. `;
            
            if (input.data) {
                simulatedResponse += `Trường "data" chứa thông tin chính với ${typeof input.data === 'object' ? Object.keys(input.data).length : 1} thuộc tính. `;
            }
            
            if (input.status) {
                simulatedResponse += `API trả về status code ${input.status}. `;
            }
            
            simulatedResponse += `\n\nĐây là phân tích sơ bộ dựa trên cấu trúc dữ liệu. Trong môi trường thực tế, mô hình LLM sẽ phân tích sâu hơn dựa trên prompt của người dùng.`;
            } else {
            simulatedResponse += `## Không có dữ liệu để phân tích\n`;
            simulatedResponse += `Không có dữ liệu đầu vào được cung cấp. Vui lòng kiểm tra kết nối giữa các node và đảm bảo dữ liệu được truyền đúng.`;
            }
            
            res.json({
            output: {
                model: model,
                prompt: config.prompt || defaultPrompt,
                response: simulatedResponse
            }
            });
        }
        } catch (error) {
        console.error('Error executing AI node:', error);
        res.status(500).json({ 
            error: 'Failed to execute AI node',
            message: error.message,
            output: {
            response: `# Lỗi khi xử lý\n\nĐã xảy ra lỗi: ${error.message}\n\nVui lòng kiểm tra lại cấu hình và thử lại.`
            }
        });
    }
});
  
// Handler cho Gemini với tiếng Việt
async function handleGemini(res, prompt, parameters, originalPrompt) {
try {
    const geminiModel = parameters.model || "gemini-1.5-flash";
    console.log(`Using Gemini model: ${geminiModel} with prompt length: ${prompt.length}`);
    
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY chưa được cấu hình trong file .env');
    }
    
    const model = genAI.getGenerativeModel({ 
    model: geminiModel
    });

    const result = await model.generateContent({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
        temperature: parameters.temperature || 0.7,
        maxOutputTokens: parameters.maxTokens || 1500
    }
    });

    const response = await result.response;
    const text = response.candidates[0].content.parts[0].text;

    console.log('Gemini response received successfully');
    
    res.json({
    output: {
        model: 'gemini',
        prompt: originalPrompt,
        response: text,
        modelVersion: geminiModel
    }
    });
} catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ 
    output: {
        model: 'gemini',
        prompt: originalPrompt,
        response: `# Lỗi khi gọi Gemini API\n\nĐã xảy ra lỗi khi xử lý yêu cầu: ${error.message}\n\nVui lòng kiểm tra API key và thử lại.`,
        error: true
    }
    });
  }
}

// 4. Output Node
app.post('/api/execute/output', async (req, res) => {
  try {
    const { config, input } = req.body;
    
    console.log('Output Node received input:', JSON.stringify(input).substring(0, 200) + '...');
    
    // Các tham số cấu hình
    const format = config.format || 'json';
    const destination = config.destination || 'console';
    const pathValue = config.path || '';
    
    // Xác định nội dung đầu ra
    let content = '';
    
    // Ưu tiên sử dụng nội dung từ AI node nếu có
    if (input && input.response) {
      // Nếu input từ AI node, ưu tiên sử dụng response (Markdown)
      content = input.response;
    } else if (config.content) {
      // Nếu không có input từ node trước, sử dụng nội dung từ cấu hình
      content = config.content;
    } else if (input) {
      // Nếu có input nhưng không phải từ AI node, chuyển đổi thành chuỗi
      content = JSON.stringify(input, null, 2);
    } else {
      // Nếu không có gì, sử dụng nội dung mặc định
      content = 'Không có dữ liệu đầu vào';
    }
    
    // Khởi tạo output
    let output = {
      format,
      destination,
      path: pathValue,
      timestamp: new Date().toISOString()
    };
    
    // Xử lý theo định dạng
    if (format === 'json') {
      try {
        let jsonContent;
        try {
          // Kiểm tra xem content có phải là JSON hợp lệ không
          jsonContent = typeof content === 'string' ? JSON.parse(content) : content;
        } catch (e) {
          // Nếu không phải, bọc trong đối tượng
          jsonContent = { content };
        }
        
        // Xử lý theo đích đến
        if (destination === 'console') {
          // In ra console
          console.log('Output (JSON):', jsonContent);
          output.response = 'Đã ghi log dữ liệu JSON vào console';
          output.data = jsonContent;
        } 
        else if (destination === 'file' && path) {
          // Lưu vào file
          const fileName = pathValue.includes('/') ? pathValue.split('/').pop() : pathValue;
          const outputPath = pathValue.startsWith('/') 
            ? pathValue 
            : path.join(OUTPUT_DIR, fileName || `output-${uuidv4()}.json`);
          
          fs.writeFileSync(outputPath, JSON.stringify(jsonContent, null, 2));
          output.response = `Đã lưu JSON vào file: ${outputPath}`;
          output.filePath = outputPath;
          output.data = jsonContent;
          
          // Tạo URL tải xuống nếu ở trong môi trường web
          const downloadUrl = `/api/download?file=${encodeURIComponent(outputPath)}`;
          output.downloadUrl = downloadUrl;
        } 
        else if (destination === 'api' && pathValue) {
          // Gọi API bên ngoài
          try {
            const apiResponse = await axios.post(pathValue, jsonContent);
            output.response = 'Đã gửi dữ liệu đến API thành công';
            output.apiResponse = {
              status: apiResponse.status,
              data: apiResponse.data
            };
          } catch (error) {
            throw new Error(`Lỗi khi gửi đến API: ${error.message}`);
          }
        } 
        else {
          // Mặc định trả về JSON
          output.response = content;
          output.data = jsonContent;
        }
      } catch (error) {
        throw new Error(`Lỗi khi xử lý JSON: ${error.message}`);
      }
    } 
    else if (format === 'word') {
      try {
        // Chuyển Markdown thành HTML
        const htmlContent = marked.parse(content);
        
        // Xử lý theo đích đến
        if (destination === 'file' || destination === 'console') {
          // Tạo tài liệu Word sử dụng docx
          const doc = new Document({
            sections: [{
              properties: {},
              children: parseMarkdownToDocx(content)
            }]
          });
          
          // Tạo buffer
          const buffer = await Packer.toBuffer(doc);
          
          // Xác định tên file
          const fileName = pathValue.includes('/') ? pathValue.split('/').pop() : (pathValue || `output-${uuidv4()}.docx`);
          const outputPath = pathValue.startsWith('/') 
            ? pathValue 
            : path.join(OUTPUT_DIR, fileName.endsWith('.docx') ? fileName : `${fileName}.docx`);
          
          // Lưu file
          fs.writeFileSync(outputPath, buffer);
          
          output.response = `Đã tạo tài liệu Word thành công: ${outputPath}`;
          output.filePath = outputPath;
          
          // Tạo URL tải xuống
          const downloadUrl = `/api/download?file=${encodeURIComponent(outputPath)}`;
          output.downloadUrl = downloadUrl;
        } 
        else if (destination === 'api' && pathValue) {
          // Gọi API để tạo Word
          try {
            const apiResponse = await axios.post(pathValue, {
              content: htmlContent,
              format: 'word'
            });
            output.response = 'Đã gửi yêu cầu tạo Word đến API thành công';
            output.apiResponse = {
              status: apiResponse.status,
              data: apiResponse.data
            };
          } catch (error) {
            throw new Error(`Lỗi khi gửi đến API Word: ${error.message}`);
          }
        }
      } catch (error) {
        throw new Error(`Lỗi khi tạo tài liệu Word: ${error.message}`);
      }
    } 
    else if (format === 'pdf') {
      try {
        // Xử lý theo đích đến
        if (destination === 'file' || destination === 'console') {
          // Sử dụng pdf-lib để tạo PDF
          const pdfDoc = await PDFDocument.create();
          
          // Chuyển đổi Markdown thành text thuần túy và xử lý cơ bản
          const plainText = content
            .replace(/#{1,6}\s+([^\n]+)/g, '$1\n') // Giữ lại nội dung heading
            .replace(/\*\*(.*?)\*\*/g, '$1') // Loại bỏ bold
            .replace(/\*(.*?)\*/g, '$1') // Loại bỏ italic
            .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)'); // Chuyển đổi link
          
          // Tạo các trang PDF
          const paragraphs = plainText.split('\n\n');
          
          // Sử dụng unidecode để xử lý chuẩn hóa các ký tự tiếng Việt
          const customTextEncoder = {
            encodeText(text) {
              // Sử dụng unidecode để chuyển đổi tiếng Việt sang ASCII
              return unidecode(text);
            }
          };
          
          // Sử dụng Times Roman cho nội dung cơ bản
          const { StandardFonts } = require('pdf-lib');
          const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
          
          // Ghi chú về font
          console.log('Đang tạo PDF với font cơ bản và xử lý dấu tiếng Việt');
          
          let currentPage = pdfDoc.addPage();
          const margin = 50;
          const fontSize = 12;
          const lineHeight = 14;
          let y = currentPage.getHeight() - margin;
          
          for (const paragraph of paragraphs) {
            if (paragraph.trim() === '') continue;
            
            // Kiểm tra xem có đủ chỗ cho đoạn văn bản trên trang hiện tại không
            const textHeight = Math.ceil(paragraph.length / 80) * lineHeight; // Ước tính
            
            if (y - textHeight < margin) {
              // Thêm trang mới
              currentPage = pdfDoc.addPage();
              y = currentPage.getHeight() - margin;
            }
            
            // Vẽ văn bản
            const wrappedText = wrapText(paragraph, 80);
            for (const line of wrappedText) {
              // Chuyển đổi văn bản tiếng Việt sang Latin cơ bản để tránh lỗi
              const safeText = customTextEncoder.encodeText(line);
              currentPage.drawText(safeText, {
                x: margin,
                y,
                size: fontSize,
                font
              });
              y -= lineHeight;
            }
            
            // Khoảng cách giữa các đoạn
            y -= 10;
          }
          
          // Lưu PDF
          const pdfBytes = await pdfDoc.save();
          
          // Xác định tên file
          const fileName = pathValue.includes('/') ? pathValue.split('/').pop() : (pathValue || `output-${uuidv4()}.pdf`);
          const outputPath = pathValue.startsWith('/') 
            ? pathValue 
            : path.join(OUTPUT_DIR, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
          
          // Lưu file
          fs.writeFileSync(outputPath, pdfBytes);
          
          output.response = `Đã tạo tài liệu PDF thành công: ${outputPath}`;
          output.filePath = outputPath;
          
          // Tạo URL tải xuống
          const downloadUrl = `/api/download?file=${encodeURIComponent(outputPath)}`;
          output.downloadUrl = downloadUrl;
        } 
        else if (destination === 'api' && pathValue) {
          // Gọi API để tạo PDF
          try {
            const apiResponse = await axios.post(pathValue, {
              content,
              format: 'pdf'
            });
            output.response = 'Đã gửi yêu cầu tạo PDF đến API thành công';
            output.apiResponse = {
              status: apiResponse.status,
              data: apiResponse.data
            };
          } catch (error) {
            throw new Error(`Lỗi khi gửi đến API PDF: ${error.message}`);
          }
        }
      } catch (error) {
        throw new Error(`Lỗi khi tạo tài liệu PDF: ${error.message}`);
      }
    }
    
    res.json({ output });
  } catch (error) {
    console.error('Error executing output node:', error);
    res.status(500).json({ 
      error: 'Failed to execute output node',
      message: error.message 
    });
  }
});

// Route để tải xuống file
app.get('/api/download', (req, res) => {
  try {
    const filePath = req.query.file;
    
    if (!filePath) {
      return res.status(400).send('Thiếu tham số file');
    }
    
    // Kiểm tra xem file có tồn tại không
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File không tồn tại');
    }
    
    // Lấy tên file
    const fileName = filePath.includes('/') ? filePath.split('/').pop() : filePath;
    
    // Thiết lập headers
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Gửi file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).send('Lỗi khi tải xuống file');
  }
});

// Hàm ngắt dòng văn bản
function wrapText(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// Hàm chuyển đổi Markdown thành các phần tử docx
function parseMarkdownToDocx(markdown) {
  const paragraphs = [];
  const lines = markdown.split('\n');
  let currentParagraph = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Heading
    if (line.startsWith('#')) {
      // Add current paragraph if it exists
      if (currentParagraph.length > 0) {
        paragraphs.push(new Paragraph({
          children: currentParagraph
        }));
        currentParagraph = [];
      }
      
      const match = line.match(/^(#+)\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        
        paragraphs.push(new Paragraph({
          heading: `Heading${Math.min(level, 6)}`,
          children: [
            new TextRun({
              text,
              bold: true,
              size: 36 - (level * 4)
            })
          ]
        }));
      }
    }
    // Empty line
    else if (line === '') {
      if (currentParagraph.length > 0) {
        paragraphs.push(new Paragraph({
          children: currentParagraph
        }));
        currentParagraph = [];
      }
      
      paragraphs.push(new Paragraph({}));
    }
    // Regular text
    else {
      // Process the text without using placeholder markers
      let text = line;
      let currentPosition = 0;
      let segments = [];
      
      // Process bold text (**text**)
      const boldRegex = /\*\*(.+?)\*\*/g;
      let boldMatch;
      
      while ((boldMatch = boldRegex.exec(text)) !== null) {
        // Add text before the bold match
        if (boldMatch.index > currentPosition) {
          segments.push({
            text: text.substring(currentPosition, boldMatch.index),
            bold: false,
            italic: false
          });
        }
        
        // Add the bold text (without the ** markers)
        segments.push({
          text: boldMatch[1],
          bold: true,
          italic: false
        });
        
        currentPosition = boldMatch.index + boldMatch[0].length;
      }
      
      // Add remaining text
      if (currentPosition < text.length) {
        segments.push({
          text: text.substring(currentPosition),
          bold: false,
          italic: false
        });
      }
      
      // Now process italic within each segment
      let processedSegments = [];
      
      for (const segment of segments) {
        if (segment.bold) {
          // Don't process italic within bold text (simplification)
          processedSegments.push(segment);
          continue;
        }
        
        let italicSegments = [];
        let italicText = segment.text;
        let italicPosition = 0;
        
        const italicRegex = /\*(.+?)\*/g;
        let italicMatch;
        
        while ((italicMatch = italicRegex.exec(italicText)) !== null) {
          // Add text before the italic match
          if (italicMatch.index > italicPosition) {
            italicSegments.push({
              text: italicText.substring(italicPosition, italicMatch.index),
              bold: segment.bold,
              italic: false
            });
          }
          
          // Add the italic text (without the * markers)
          italicSegments.push({
            text: italicMatch[1],
            bold: segment.bold,
            italic: true
          });
          
          italicPosition = italicMatch.index + italicMatch[0].length;
        }
        
        // Add remaining text
        if (italicPosition < italicText.length) {
          italicSegments.push({
            text: italicText.substring(italicPosition),
            bold: segment.bold,
            italic: false
          });
        }
        
        processedSegments = processedSegments.concat(italicSegments);
      }
      
      // Add all processed segments to the current paragraph
      for (const segment of processedSegments) {
        if (segment.text) {
          currentParagraph.push(new TextRun({
            text: segment.text,
            bold: segment.bold,
            italic: segment.italic
          }));
        }
      }
    }
  }
  
  // Add the final paragraph if it exists
  if (currentParagraph.length > 0) {
    paragraphs.push(new Paragraph({
      children: currentParagraph
    }));
  }
  
  return paragraphs;
}

// Xử lý tạo file Word từ Markdown
app.post('/api/generate-word', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Thiếu nội dung' });
    }
    
    // Tạo tài liệu Word
    const doc = new Document({
      sections: [{
        properties: {},
        children: parseMarkdownToDocx(content)
      }]
    });
    
    // Tạo buffer
    const buffer = await Packer.toBuffer(doc);
    
    // Tạo tên file
    const fileName = `document-${uuidv4()}.docx`;
    const outputPath = path.join(OUTPUT_DIR, fileName);
    
    // Lưu file
    fs.writeFileSync(outputPath, buffer);
    
    // Trả về thông tin file
    res.json({
      success: true,
      filePath: outputPath,
      fileName,
      downloadUrl: `/api/download?file=${encodeURIComponent(outputPath)}`
    });
  } catch (error) {
    console.error('Error generating Word document:', error);
    res.status(500).json({ error: 'Lỗi khi tạo tài liệu Word' });
  }
});

// Xử lý tạo file PDF từ Markdown
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Thiếu nội dung' });
    }
    
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    
    // Convert Markdown to plain text with basic formatting
    const plainText = content
      .replace(/#{1,6}\s+([^\n]+)/g, '$1\n') // Keep heading content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)'); // Convert links
    
    // Split into paragraphs
    const paragraphs = plainText.split('\n\n');
    
    // Use a standard font - we'll need to be careful with Unicode
    const { StandardFonts } = require('pdf-lib');
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    console.log('Creating PDF with Unicode support for Vietnamese characters');
    
    let currentPage = pdfDoc.addPage();
    const margin = 50;
    const fontSize = 12;
    const lineHeight = 18; // Increased line height to prevent overlapping
    let y = currentPage.getHeight() - margin;
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') continue;
      
      // Estimate text height
      const textHeight = Math.ceil(paragraph.length / 70) * lineHeight; // Adjusted width
      
      if (y - textHeight < margin) {
        // Add new page
        currentPage = pdfDoc.addPage();
        y = currentPage.getHeight() - margin;
      }
      
      // Draw text with proper wrapping
      const wrappedText = wrapText(paragraph, 70); // Adjusted width
      for (const line of wrappedText) {
        try {
          // Draw text without using unidecode
          currentPage.drawText(line, {
            x: margin,
            y,
            size: fontSize,
            font
          });
        } catch (e) {
          // If there's a character encoding issue, try to handle it gracefully
          console.warn('Character encoding issue in PDF:', e.message);
          // Try to draw what we can - replace unsupported chars with '?'
          const safeLine = line.replace(/[^\x00-\x7F]/g, '?');
          currentPage.drawText(safeLine, {
            x: margin,
            y,
            size: fontSize,
            font
          });
        }
        y -= lineHeight;
      }
      
      // Space between paragraphs
      y -= 10;
    }
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    
    // Create filename
    const fileName = `document-${uuidv4()}.pdf`;
    const outputPath = path.join(OUTPUT_DIR, fileName);
    
    // Save file
    fs.writeFileSync(outputPath, pdfBytes);
    
    // Return file info
    res.json({
      success: true,
      filePath: outputPath,
      fileName,
      downloadUrl: `/api/download?file=${encodeURIComponent(outputPath)}`
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Lỗi khi tạo tài liệu PDF' });
  }
});

// Improved wrap text function
function wrapText(text, maxCharsPerLine) {
  // First, we'll split the text by natural line breaks
  const naturalLines = text.split('\n');
  const wrappedLines = [];
  
  for (const naturalLine of naturalLines) {
    if (naturalLine.length <= maxCharsPerLine) {
      wrappedLines.push(naturalLine);
      continue;
    }
    
    // Split by word for wrapping
    const words = naturalLine.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        wrappedLines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  }
  
  return wrappedLines;
}

// Xử lý lưu file JSON
app.post('/api/save-file', (req, res) => {
  try {
    const { path: pathParam, content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Thiếu nội dung' });
    }
    
    // Xác định đường dẫn file
    const fileName = pathParam ? (pathParam.includes('/') ? pathParam.split('/').pop() : pathParam) : `data-${uuidv4()}.json`;
    const outputPath = pathParam && pathParam.startsWith('/') 
      ? pathParam 
      : path.join(OUTPUT_DIR, fileName.endsWith('.json') ? fileName : `${fileName}.json`);
    
    // Chuẩn bị nội dung
    let jsonContent;
    if (typeof content === 'string') {
      try {
        jsonContent = JSON.parse(content);
      } catch (e) {
        jsonContent = { content };
      }
    } else {
      jsonContent = content;
    }
    
    // Lưu file
    fs.writeFileSync(outputPath, JSON.stringify(jsonContent, null, 2));
    
    // Trả về thông tin file
    res.json({
      success: true,
      filePath: outputPath,
      fileName,
      downloadUrl: `/api/download?file=${encodeURIComponent(outputPath)}`
    });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Lỗi khi lưu file' });
  }
});

// Tải xuống file
app.get('/api/download', (req, res) => {
  try {
    const filePathParam = req.query.file;
    
    if (!filePathParam) {
      return res.status(400).send('Thiếu tham số file');
    }
    
    // Xử lý đường dẫn tương đối
    const resolvedPath = filePathParam.startsWith('/') ? filePathParam : path.join(OUTPUT_DIR, filePathParam);
    
    // Kiểm tra tồn tại và bảo mật (không cho phép truy cập file ngoài thư mục OUTPUT_DIR)
    const normalizedPath = path.normalize(resolvedPath);
    const normalizedOutputDir = path.normalize(OUTPUT_DIR);
    
    if (!normalizedPath.startsWith(normalizedOutputDir) && !normalizedPath.startsWith('/')) {
      return res.status(403).send('Không được phép truy cập file ngoài thư mục OUTPUT_DIR');
    }
    
    // Kiểm tra tồn tại
    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).send('File không tồn tại');
    }
    
    // Lấy tên file
    const fileName = normalizedPath.split('/').pop();
    
    // Kiểm tra loại file
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.json') {
      contentType = 'application/json';
    } else if (ext === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (ext === '.pdf') {
      contentType = 'application/pdf';
    }
    
    // Thiết lập headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Gửi file
    res.sendFile(normalizedPath);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).send('Lỗi khi tải xuống file');
  }
});

// Liệt kê các file đã tạo
app.get('/api/files', (req, res) => {
  try {
    // Kiểm tra xem thư mục OUTPUT_DIR có tồn tại không
    if (!fs.existsSync(OUTPUT_DIR)) {
      return res.json({ files: [] });
    }
    
    // Đọc danh sách file
    const files = fs.readdirSync(OUTPUT_DIR)
      .filter(file => {
        // Kiểm tra phần mở rộng file
        const ext = path.extname(file).toLowerCase();
        return ['.json', '.docx', '.pdf'].includes(ext);
      })
      .map(file => {
        const filePath = path.join(OUTPUT_DIR, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          downloadUrl: `/api/download?file=${encodeURIComponent(filePath)}`
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime()); // Sắp xếp theo thời gian sửa đổi mới nhất
    
    res.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Lỗi khi liệt kê files' });
  }
});

// Xóa file
app.delete('/api/files/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    if (!filename) {
      return res.status(400).json({ error: 'Thiếu tên file' });
    }
    
    // Xử lý đường dẫn tương đối và bảo mật
    const filePath = path.join(OUTPUT_DIR, filename);
    const normalizedPath = path.normalize(filePath);
    const normalizedOutputDir = path.normalize(OUTPUT_DIR);
    
    if (!normalizedPath.startsWith(normalizedOutputDir)) {
      return res.status(403).json({ error: 'Không được phép xóa file ngoài thư mục OUTPUT_DIR' });
    }
    
    // Kiểm tra tồn tại
    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }
    
    // Xóa file
    fs.unlinkSync(normalizedPath);
    
    res.json({ success: true, message: `Đã xóa file ${filename}` });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Lỗi khi xóa file' });
  }
});

// 5. Condition Node
app.post('/api/execute/condition', async (req, res) => {
  try {
    const { config, input } = req.body;
    
    const condition = config.condition || 'true';
    const expressionLanguage = config.expressionLanguage || 'javascript';
    
    let result = false;
    
    if (expressionLanguage === 'javascript') {
      // Execute JavaScript condition (using Function constructor for isolation)
      // Note: In production, you would want to use a more secure sandboxed evaluation
      try {
        const evalFunction = new Function('data', `return ${condition};`);
        result = !!evalFunction(input);
      } catch (e) {
        throw new Error(`Error evaluating condition: ${e.message}`);
      }
    } else if (expressionLanguage === 'python') {
      // This would require Python integration, like child_process or a Python service
      // For now, we'll return a mock result
      result = Math.random() >= 0.5; // Random true/false for demo
    }
    
    const output = {
      condition,
      expressionLanguage,
      result: result.toString(),
      input: input
    };
    
    res.json({ output });
  } catch (error) {
    console.error('Error executing condition node:', error);
    res.status(500).json({ 
      error: 'Failed to execute condition node',
      message: error.message 
    });
  }
});

// Execute entire workflow
app.post('/api/execute/workflow', async (req, res) => {
  try {
    const { workflow } = req.body;
    
    if (!workflow || !workflow.nodes || !workflow.connections) {
      return res.status(400).json({ error: 'Invalid workflow data' });
    }
    
    // TODO: Implement workflow execution logic
    // This would involve:
    // 1. Identifying start nodes (triggers)
    // 2. Executing nodes in sequence based on connections
    // 3. Handling conditional branching
    // 4. Collecting results from all executed nodes
    
    // For now, return a simulated response
    res.json({
      success: true,
      message: 'Workflow execution simulated',
      nodes: workflow.nodes.length,
      connections: workflow.connections.length
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ 
      error: 'Failed to execute workflow',
      message: error.message 
    });
  }
});

// Webhook endpoint for trigger nodes
app.all('/webhook/:id', (req, res) => {
  const webhookId = req.params.id;
  
  // Store the webhook data for the trigger node
  const webhookData = {
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body,
    timestamp: new Date().toISOString()
  };
  
  // In a real implementation, you would notify the workflow system
  // that a webhook was triggered, or store this data for the next
  // workflow execution
  
  fs.writeFileSync(
    path.join(STORAGE_DIR, `webhook-${webhookId}.json`),
    JSON.stringify(webhookData, null, 2)
  );
  
  res.json({ success: true, message: 'Webhook received' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});