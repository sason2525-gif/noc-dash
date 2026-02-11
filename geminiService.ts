import { GoogleGenAI } from "@google/genai";

/**
 * Generates an AI summary for the shift based on faults and planned works.
 */
export const generateAISummary = async (
  faults: any[], 
  planned: any[], 
  shiftInfo: any
) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    return "שגיאה: מפתח ה-API לא מוגדר במערכת.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    פעל כבקר רשת מומחה במוקד NOC סלולרי. ערוך סיכום משמרת מקצועי, קריא וברור בעברית על בסיס הנתונים הבאים:
    בקרים: ${shiftInfo.controllers.join(' ו-')}
    משמרת: ${shiftInfo.shiftType}
    תאריך: ${shiftInfo.date}
    
    תקלות אתרים סלולריים:
    ${faults.map(f => `- אתר ${f.siteNumber} (${f.siteName}): סיבה: ${f.reason}, טיפול: ${f.treatment || 'טרם עודכן'}, סטטוס: ${f.status === 'closed' ? 'סגור' : 'פתוח'}`).join('\n')}
    
    עבודות יזומות:
    ${planned.map(p => `- ${p.description}`).join('\n')}
    
    אירועים מיוחדים נוספים: ${shiftInfo.generalNotes || 'אין אירועים מיוחדים'}
    
    אנא צור סיכום מובנה הכולל:
    1. כותרת ברורה עם פרטי המשמרת
    2. טבלת תקלות (נסח מחדש את הטיפולים בצורה טכנית ומקצועית)
    3. הפרדה ברורה בין מה שנסגר לבין מה שנותר פתוח להמשך טיפול
    4. פירוט עבודות יזומות
    5. הערות כלליות
    
    השתמש באמוג'ים רלוונטיים (כמו 📡, 🔋, ⚠️, ✅) והקפד על עיצוב שמתאים להודעת WhatsApp.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Summary generation failed:", error);
    return null;
  }
};