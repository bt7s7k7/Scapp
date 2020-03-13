module.exports = {
    "transpileDependencies": [
        "vuetify"
    ],
    pwa: {
        "themeColor": "#1976d2",
        "display": "fullscreen",
        "orientation": "portrait",
        "iconPaths": {
            favicon32: 'images/icons/favicon-32x32.png',
            favicon16: 'images/icons/favicon-16x16.png',
            appleTouchIcon: 'images/icons/apple-touch-icon-152x152.png',
            maskIcon: 'images/icons/safari-pinned-tab.svg',
            msTileImage: 'images/icons/msapplication-icon-144x144.png'
        },
        "manifestOptions": {
            "name": "Scapp",
            "short_name": "Scapp",
            "theme_color": "#1976d2",
            "background_color": "#ffffff",
            "display": "fullscreen",
            "orientation": "portrait",
            "Scope": "/",
            "start_url": "/",
            "icons": [
                {
                    "src": "images/icons/icon-72x72.png",
                    "sizes": "72x72",
                    "type": "image/png"
                },
                {
                    "src": "images/icons/icon-96x96.png",
                    "sizes": "96x96",
                    "type": "image/png"
                },
                {
                    "src": "images/icons/icon-128x128.png",
                    "sizes": "128x128",
                    "type": "image/png"
                },
                {
                    "src": "images/icons/icon-144x144.png",
                    "sizes": "144x144",
                    "type": "image/png"
                },
                {
                    "src": "images/icons/icon-152x152.png",
                    "sizes": "152x152",
                    "type": "image/png"
                },
                {
                    "src": "images/icons/icon-192x192.png",
                    "sizes": "192x192",
                    "type": "image/png"
                },
                {
                    "src": "images/icons/icon-384x384.png",
                    "sizes": "384x384",
                    "type": "image/png"
                },
                {
                    "src": "images/icons/icon-512x512.png",
                    "sizes": "512x512",
                    "type": "image/png"
                }
            ],
            "splash_pages": null
        }
    }
}