
import { GoogleGenAI } from "@google/genai";

/**
 * Generates an AI summary for the shift based on faults and planned works.
 * Strictly no emojis, including downtime and battery backup details.
 */
export const generateAISummary = async (
  faults: any[], 
  planned: any[], 
  shiftInfo: any
) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing");
    return "שגיאה: מפתח ה-API לא מוגדר.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    פעל כבקר רשת מומחה במוקד NOC. ערוך סיכום משמרת מקצועי וטכני בעברית.
    
    חוקים קשיחים לפלט:
    1. אל תשתמש באייקונים או אמוג'ים בכלל (No emojis allowed).
    2. לכל אתר ברשימה, חובה לציין: מספר אתר, שם אתר, סיבת ירידה, כיצד טופל, וזמן השבתה.
    3. במידה ודווח זמן גיבוי מצברים (בבעיות חשמל), חובה לציין אותו בפירוט האתר.
    4. שמור על מבנה נקי ומקצועי בלבד.
    
    נתוני המקור:
    בקרים: ${shiftInfo.controllers.filter(Boolean).join(' ו-')}
    משמרת: ${shiftInfo.shiftType}
    תאריך: ${shiftInfo.date}
    
    רשימת תקלות:
    ${faults.map(f => `- אתר ${f.siteNumber} (${f.siteName}): סיבה: ${f.reason}, טיפול: ${f.treatment || 'בטיפול'}, סטטוס: ${f.status === 'closed' ? 'סגור' : 'פתוח'}, זמן השבתה: ${f.downtime}${f.isPowerIssue && f.batteryBackupTime ? `, גיבוי מצברים: ${f.batteryBackupTime}` : ''}`).join('\n')}
    
    עבודות יזומות:
    ${planned.map(p => `- ${p.description}`).join('\n')}
    
    הערות נוספות: ${shiftInfo.generalNotes || 'אין'}
    
    בנה סיכום הכולל:
    - כותרת: סיכום משמרת [סוג] תאריך [תאריך]
    - פירוט תקלות שנסגרו (כולל זמני השבתה וטיפול)
    - פירוט תקלות פתוחות (כולל סיבות וזמני השבתה)
    - עבודות יזומות שבוצעו
    - הערות כלליות/חריגים
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Summary generation failed", error);
    return null;
  }
};
