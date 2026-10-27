export const HEADING_FONT = ['Balsamiq Sans', 'Arial', 'sans-serif'];

// Pixi measures text when it is created, so load the font before building UI.
export const headingFontReady = document.fonts.load('700 32px "Balsamiq Sans"').catch(error => {
    console.warn('Heading font unavailable; using fallback:', error);
});
