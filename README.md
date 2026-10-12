# ANZOBOT Office · espejo público

Espejo **público y de solo lectura** de la oficina animada de un bot de trading: cada personaje es una pieza del bot (estrategias, riesgo, cierres, conciliación...).
**No muestra montos ni cuentas**: solo estados, el lado de las posiciones, el nivel de evidencia de cada estrategia y el resultado del día como fracción de su tope. Los
datos llegan con unos minutos de retraso. No es una recomendación de inversión.

- La página es estática (`index.html` + `js/` + `css/`), sin dependencias ni servicios de terceros salvo la lectura de `state.json` de la rama `data` de este repositorio.
- `state.json` lo genera y sube una tarea programada del dueño del bot; esta rama `main` solo contiene la página.
- Todo el código y los sprites son propios (nada de assets de terceros).
