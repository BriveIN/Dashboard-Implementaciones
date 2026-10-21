import path from 'node:path';
import lwc from '@lwc/rollup-plugin';
import alias from '@rollup/plugin-alias';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

// Visor local: el LWC real de force-app con lightning-* y Apex simulados (preview/stubs y preview/mocks)
const enModoDev = !!process.env.ROLLUP_WATCH;
const ruta = (p) => path.resolve(import.meta.dirname, p);

export default {
    input: ruta('preview/main.js'),
    output: { file: ruta('preview/dist/main.js'), format: 'esm', sourcemap: true },
    plugins: [
        alias({
            entries: [
                // cada método de Apex tiene su simulación en preview/mocks/apex/<método>.js
                { find: /^@salesforce\/apex\/ImplementacionesPanelController\.(\w+)$/, replacement: `${ruta('preview/mocks/apex')}/$1.js` },
                { find: /^@salesforce\/apex\/PlanTrabajoController\.(\w+)$/, replacement: `${ruta('preview/mocks/apex')}/$1.js` },
                { find: /^@salesforce\/resourceUrl\/.+$/, replacement: ruta('preview/mocks/recurso.js') }
            ]
        }),
        replace({ preventAssignment: true, 'process.env.NODE_ENV': JSON.stringify('development') }),
        resolve(),
        lwc({
            rootDir: ruta('preview'),
            modules: [
                { name: 'c/implementacionesPanel', path: ruta('force-app/main/default/lwc/implementacionesPanel/implementacionesPanel.js') },
                { name: 'c/implementacionesBarras', path: ruta('force-app/main/default/lwc/implementacionesBarras/implementacionesBarras.js') },
                { name: 'c/implementacionesUtil', path: ruta('force-app/main/default/lwc/implementacionesUtil/implementacionesUtil.js') },
                { name: 'c/implementacionesLista', path: ruta('force-app/main/default/lwc/implementacionesLista/implementacionesLista.js') },
                { name: 'c/implementacionesDetalle', path: ruta('force-app/main/default/lwc/implementacionesDetalle/implementacionesDetalle.js') },
                { name: 'c/planTrabajoXlsx', path: ruta('force-app/main/default/lwc/planTrabajoXlsx/planTrabajoXlsx.js') },
                { dir: ruta('preview/stubs') }
            ]
        }),
        enModoDev && serve({ contentBase: ruta('preview'), port: 3000, host: 'localhost' }),
        enModoDev && livereload({ watch: ruta('preview/dist'), verbose: false })
    ]
};
