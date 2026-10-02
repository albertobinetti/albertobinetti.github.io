(() => {
    const palettes = window.sitePalettes;
    if (!Array.isArray(palettes) || !palettes.length) return;

    const storageKey = 'website-palette';
    const root = document.documentElement;
    const icons = new Map();
    let current = palettes[0];

    try {
        const saved = localStorage.getItem(storageKey);
        current = palettes.find(palette => palette.id === saved) || current;
    } catch (_) {
        // Color switching still works when browser storage is unavailable.
    }

    function applyColors(palette) {
        current = palette;
        root.dataset.palette = palette.id;
        for (const [property, value] of Object.entries({
            '--accent': palette.accent,
            '--accent-muted': palette.muted,
            '--accent-soft': palette.soft,
            '--code-bg': palette.surface,
            '--tertiary': palette.muted,
            '--border': palette.border
        })) root.style.setProperty(property, value);

        document.querySelectorAll('meta[name="theme-color"], meta[name="msapplication-TileColor"]')
            .forEach(meta => { meta.content = palette.accent; });
    }

    function applyIcons(palette) {
        document.querySelectorAll('[data-palette-icon]').forEach(image => {
            image.src = palette.icon;
        });

        function publishIcon(icon) {
            if (current.id !== palette.id) return;
            const favicon = document.getElementById('site-favicon');
            const appleIcon = document.getElementById('site-apple-icon');
            if (favicon) favicon.href = icon.small;
            if (appleIcon) appleIcon.href = icon.large;
        }

        if (icons.has(palette.id)) {
            publishIcon(icons.get(palette.id));
            return;
        }

        // Rasterize the matching AB SVG so browsers receive a standard PNG favicon.
        const image = new Image();
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) return;
                const render = size => {
                    canvas.width = canvas.height = size;
                    context.drawImage(image, 0, 0, size, size);
                    return canvas.toDataURL('image/png');
                };
                const icon = { small: render(32), large: render(180) };
                icons.set(palette.id, icon);
                publishIcon(icon);
            } catch (_) {
                // The static red favicon remains available if canvas is restricted.
            }
        };
        image.src = palette.icon;
    }

    function applyPage(palette) {
        applyColors(palette);
        const portrait = document.getElementById('profile-portrait');
        if (portrait) portrait.src = palette.portrait;
        document.querySelectorAll('[data-palette-choice]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.paletteChoice === palette.id));
        });
        applyIcons(palette);
    }

    applyColors(current);

    document.addEventListener('DOMContentLoaded', () => {
        applyPage(current);
        document.querySelectorAll('[data-palette-choice]').forEach(button => {
            button.addEventListener('click', () => {
                const palette = palettes.find(item => item.id === button.dataset.paletteChoice);
                if (!palette) return;
                applyPage(palette);
                try { localStorage.setItem(storageKey, palette.id); } catch (_) {}
            });
        });

        // These small portraits are ready before the visitor clicks another color.
        palettes.forEach(palette => { new Image().src = palette.portrait; });
    }, { once: true });

    window.addEventListener('storage', event => {
        if (event.key !== storageKey) return;
        applyPage(palettes.find(palette => palette.id === event.newValue) || palettes[0]);
    });
})();
