const API_URL = 'http://192.168.2.50:3002/api';
let troqueles = []; // Ahora se carga desde la DB
let catalogos = { clientes: [], proveedores: [], responsables: [] };
let imagenesTemp = [];
let pestanaActual = 'activos';
let filtroDashboard = 'todos';
let lightboxImages = [];
let lightboxIndex = 0;
let troquelActivoId = null;
let catalogoActual = 'clientes';

// Globales para Sorting y Paginación
let sortCol = 'nombre';
let sortDir = 'asc';
let paginaActual = 1;
const itemsPorPagina = 10;

const listaTroqueles = document.getElementById('listaTroqueles');
const statActivos = document.getElementById('statActivos');
const statDepurados = document.getElementById('statDepurados');
const statMantenimiento = document.getElementById('statMantenimiento');
const emptyState = document.getElementById('emptyState');
const troquelesTable = document.getElementById('troquelesTable');
const searchInput = document.getElementById('searchInput');
const modalForm = document.getElementById('modalFormulario');
const modalDetalle = document.getElementById('modalDetalle');
const formTroquel = document.getElementById('formTroquel');

// === UTILIDADES ===
/**
 * Escapa HTML para prevenir ataques XSS.
 */
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Formatea un número como moneda ($0,000).
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function hoy() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Formatea una fecha ISO o string (ej: "2026-05-14T05:00:00.000Z" o "2026-05-14") a formato DD-MM-YYYY.
 */
function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    try {
        const datePart = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
        const partes = datePart.split('-');
        if (partes.length === 3) {
            if (partes[0].length === 4) {
                const [anio, mes, dia] = partes;
                return `${dia}-${mes}-${anio}`;
            }
            if (partes[2].length === 4) {
                return datePart;
            }
        }
    } catch (e) {
        console.error('Error al formatear fecha:', e);
    }
    return fechaStr;
}

function getLongDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('es-ES', options);
}

/**
 * Muestra una notificación tipo Toast.
 */
function mostrarToast(mensaje, tipo) {
    const container = document.getElementById('toastContainer');
    const iconos = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + (tipo || 'info');
    toast.innerHTML = `<i class="fa-solid ${iconos[tipo] || iconos.info}"></i><span>${escapeHTML(mensaje)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

/**
 * Debounce para funciones con alta frecuencia de llamada.
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await cargarCatalogos();
    await cargarDatos();
    actualizarVista();
    initDragAndDrop();

    const debouncedSearch = debounce(() => {
        paginaActual = 1;
        actualizarVista();
    }, 300);

    searchInput.addEventListener('input', debouncedSearch);

    document.getElementById('imagenesInput').addEventListener('change', (e) => procesarArchivos(e.target.files));

    // Headers de tabla para sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            setSort(col);
        });
    });

    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cerrarModalFormulario();
            cerrarModalDetalle();
            cerrarModalDepuracion();
            cerrarLightbox();
        }

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                abrirModalNuevo();
            }
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                searchInput.focus();
            }
        }
    });
});

// === ALMACENAMIENTO (API) ===
async function cargarDatos() {
    try {
        const response = await fetch(`${API_URL}/troqueles`);
        troqueles = await response.json();
    } catch (err) {
        console.error('Error al cargar troqueles:', err);
        mostrarToast('Error de conexión con el servidor.', 'error');
    }
}

async function cargarCatalogos() {
    try {
        const [c, p, r] = await Promise.all([
            fetch(`${API_URL}/clientes`).then(res => res.json()),
            fetch(`${API_URL}/proveedores`).then(res => res.json()),
            fetch(`${API_URL}/responsables`).then(res => res.json())
        ]);

        catalogos = { clientes: c, proveedores: p, responsables: r };
        actualizarSelects();
    } catch (err) {
        console.error('Error al cargar catálogos:', err);
    }
}

function actualizarSelects() {
    llenarSelect('cliente_id', catalogos.clientes);
    llenarSelect('proveedor_id', catalogos.proveedores);
}

function llenarSelect(id, data) {
    const select = document.getElementById(id);
    if (!select) return;
    const valActual = select.value;
    select.innerHTML = `<option value="">-- Seleccionar --</option>`;
    data.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.nombre;
        select.appendChild(opt);
    });
    select.value = valActual;
}

async function guardarDatos() {
    // Esta función ahora es redundante ya que cada acción hace su propio fetch,
    // pero la mantenemos para compatibilidad con llamadas existentes o recarga.
    await cargarDatos();
    actualizarVista();
}

// === PESTAÑAS Y DASHBOARD ===
function filtrarPorDashboard(tipo) {
    // Resetear filtro si se hace click en el mismo que ya está activo (opcional, pero intuitivo)
    if (tipo === 'activos') {
        filtroDashboard = 'todos';
        cambiarPestana('activos');
    } else if (tipo === 'mantenimiento') {
        // Si ya estamos filtrando por mantenimiento, lo quitamos. Si no, lo ponemos.
        filtroDashboard = (filtroDashboard === 'mantenimiento') ? 'todos' : 'mantenimiento';
        cambiarPestana('activos');
    } else if (tipo === 'depurados') {
        filtroDashboard = 'todos';
        cambiarPestana('depurados');
    }
}

function cambiarPestana(pestana) {
    pestanaActual = pestana;
    paginaActual = 1;

    const tabActivos = document.getElementById('tabActivos');
    const tabDepurados = document.getElementById('tabDepurados');

    tabActivos.classList.toggle('active', pestana === 'activos');
    tabDepurados.classList.toggle('active', pestana === 'depurados');
    tabActivos.setAttribute('aria-selected', pestana === 'activos');
    tabDepurados.setAttribute('aria-selected', pestana === 'depurados');

    const tableContainer = document.getElementById('tableContainer');
    if (tableContainer) {
        tableContainer.setAttribute('aria-labelledby', pestana === 'activos' ? 'tabActivos' : 'tabDepurados');
    }

    // Resetear filtro de dashboard si cambiamos a una pestaña que no lo soporta o si es un cambio manual de pestaña
    if (pestana === 'depurados') filtroDashboard = 'todos';

    if (searchInput) searchInput.value = '';
    actualizarVista();
}

// === SORTING ===
function setSort(col) {
    if (sortCol === col) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
        sortCol = col;
        sortDir = 'asc';
    }
    actualizarVista();
}

function ordenarDatos(datos) {
    return datos.sort((a, b) => {
        let valA = a[sortCol] || '';
        let valB = b[sortCol] || '';

        // Manejo especial para columna Valor Total
        if (sortCol === 'total') {
            valA = (a.cantidad || 0) * (a.costo || 0);
            valB = (b.cantidad || 0) * (b.costo || 0);
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        // Manejar números
        if (!isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '') {
            valA = Number(valA);
            valB = Number(valB);
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
}

// === DATOS Y FILTRADO ===
function obtenerDatosFiltrados() {
    const query = searchInput.value.toLowerCase();

    // Filtro base por pestaña (Activos vs Depurados)
    let filtrados = troqueles.filter(t => {
        const esDepurado = (t.estado === 'Depurado');
        return pestanaActual === 'activos' ? !esDepurado : esDepurado;
    });

    // Filtro adicional por dashboard (Mantenimiento)
    if (pestanaActual === 'activos' && filtroDashboard === 'mantenimiento') {
        filtrados = filtrados.filter(t => t.estado === 'En Mantenimiento');
    }

    // Filtro por búsqueda
    if (query.trim() !== '') {
        // Intentar parsear a número para búsqueda exacta en medidas
        const queryNum = parseFloat(query);
        const isQueryNum = !isNaN(queryNum);

        filtrados = filtrados.filter(t =>
            t.nombre.toLowerCase().includes(query) ||
            (t.cliente_nombre && t.cliente_nombre.toLowerCase().includes(query)) ||
            (t.referencia && t.referencia.toLowerCase().includes(query)) ||
            (t.op && t.op.toLowerCase().includes(query)) ||
            (t.proveedor_nombre && t.proveedor_nombre.toLowerCase().includes(query)) ||
            (isQueryNum && (
                Number(t.ancho) === queryNum ||
                Number(t.profundo) === queryNum ||
                Number(t.alto) === queryNum
            ))
        );
    }

    return ordenarDatos(filtrados);
}

function actualizarVista() {
    const noDepurados = troqueles.filter(t => t.estado !== 'Depurado');
    const mantenimiento = troqueles.filter(t => t.estado === 'En Mantenimiento');
    const depurados = troqueles.filter(t => t.estado === 'Depurado');

    statActivos.textContent = noDepurados.length;
    if (statMantenimiento) statMantenimiento.textContent = mantenimiento.length;
    statDepurados.textContent = depurados.length;

    // Actualizar estado visual de las tarjetas del dashboard
    const cardActivos = document.getElementById('cardActivos');
    const cardMaint = document.getElementById('cardMantenimiento');
    const cardDep = document.getElementById('cardDepurados');

    if (cardActivos) cardActivos.classList.toggle('active', pestanaActual === 'activos' && filtroDashboard === 'todos');
    if (cardMaint) cardMaint.classList.toggle('active', pestanaActual === 'activos' && filtroDashboard === 'mantenimiento');
    if (cardDep) cardDep.classList.toggle('active', pestanaActual === 'depurados');

    const datos = obtenerDatosFiltrados();
    renderTabla(datos);
    renderPaginacion(datos.length);
    actualizarHeadersSorting();
}

function actualizarHeadersSorting() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sort-active');
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.className = 'fa-solid fa-sort sort-icon';

        if (th.getAttribute('data-sort') === sortCol) {
            th.classList.add('sort-active');
            if (icon) icon.className = `fa-solid fa-sort-${sortDir === 'asc' ? 'up' : 'down'} sort-icon`;
        }
    });
}

async function guardarDatos() {
    // En la versión PostgreSQL, esta función recarga los datos desde el servidor
    // para asegurar que la vista esté sincronizada con la base de datos.
    await cargarDatos();
    actualizarVista();
}

// === RENDERIZADO DE TABLA ===
/**
 * Renderiza los troqueles en la tabla principal.
 */
function renderTabla(datos, ignorarPaginacion = false, mostrarTotal = false) {
    listaTroqueles.innerHTML = '';

    if (datos.length === 0) {
        troquelesTable.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    troquelesTable.style.display = 'table';
    emptyState.style.display = 'none';

    let itemsPagina = [];
    if (ignorarPaginacion) {
        itemsPagina = datos;
    } else {
        const inicio = (paginaActual - 1) * itemsPorPagina;
        const fin = inicio + itemsPorPagina;
        itemsPagina = datos.slice(inicio, fin);
    }

    // Actualizar encabezado de costo si es necesario
    const costHeader = document.querySelector('th[data-sort="costo"]');
    if (costHeader) {
        costHeader.firstChild.textContent = mostrarTotal ? 'Valor Total ' : 'Costo ';
    }

    itemsPagina.forEach((troquel, index) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 0.05}s`;

        const portada = (troquel.imagenes && troquel.imagenes.length > 0)
            ? troquel.imagenes[0]
            : 'https://via.placeholder.com/50?text=No+Img';

        let claseEstado = 'status-activo';
        if (troquel.estado === 'En Mantenimiento') claseEstado = 'status-mantenimiento';
        if (troquel.estado === 'Depurado') claseEstado = 'status-depurado';

        const valorAMostrar = mostrarTotal
            ? (Number(troquel.cantidad) || 0) * (Number(troquel.costo) || 0)
            : (Number(troquel.costo) || 0);

        let botonesAccion = '';
        if (pestanaActual === 'activos') {
            botonesAccion = `
                <button class="btn-icon view" onclick="verDetalle('${troquel.id}')" title="Ver Detalle" aria-label="Ver detalle"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-icon edit" onclick="editarTroquel('${troquel.id}')" title="Editar" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" onclick="iniciarDepuracion('${troquel.id}')" title="Depurar" aria-label="Depurar"><i class="fa-solid fa-archive"></i></button>`;
        } else {
            botonesAccion = `
                <button class="btn-icon view" onclick="verDetalle('${troquel.id}')" title="Ver Detalle" aria-label="Ver detalle"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-icon edit" onclick="restaurarTroquel('${troquel.id}')" title="Restaurar" aria-label="Restaurar" style="color:var(--secondary)"><i class="fa-solid fa-rotate-left"></i></button>
                <button class="btn-icon delete" onclick="eliminarDefinitivamente('${troquel.id}')" title="Eliminar permanentemente" aria-label="Eliminar"><i class="fa-solid fa-trash-can"></i></button>`;
        }

        tr.innerHTML = `
            <td class="no-print">
                <img src="${portada}" class="img-thumbnail" alt="Miniatura de ${escapeHTML(troquel.nombre)}" loading="lazy">
            </td>
            <td><strong>${escapeHTML(troquel.nombre)}</strong></td>
            <td><code>${escapeHTML(troquel.referencia || '-')}</code></td>
            <td><code>${escapeHTML(troquel.op || '-')}</code></td>
            <td>${escapeHTML(troquel.cliente_nombre) || '<span class="text-light">N/A</span>'}</td>
            <td>${escapeHTML(troquel.ubicacion) || '<span class="text-light">-</span>'}</td>
            <td>${troquel.cantidad}</td>
            <td>${formatCurrency(valorAMostrar)}</td>
            <td><span class="badge-status ${claseEstado}">${escapeHTML(troquel.estado) || 'Activo'}</span></td>
            <td class="no-print">${botonesAccion}</td>`;
        listaTroqueles.appendChild(tr);
    });
}

function renderPaginacion(totalItems) {
    const totalPaginas = Math.ceil(totalItems / itemsPorPagina);
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    container.innerHTML = '';

    if (totalPaginas <= 1) return;

    const btnPrev = document.createElement('button');
    btnPrev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    btnPrev.disabled = paginaActual === 1;
    btnPrev.onclick = () => { paginaActual--; actualizarVista(); };
    container.appendChild(btnPrev);

    for (let i = 1; i <= totalPaginas; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === paginaActual ? 'active' : '';
        btn.onclick = () => { paginaActual = i; actualizarVista(); };
        container.appendChild(btn);
    }

    const btnNext = document.createElement('button');
    btnNext.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    btnNext.disabled = paginaActual === totalPaginas;
    btnNext.onclick = () => { paginaActual++; actualizarVista(); };
    container.appendChild(btnNext);
}

// === MODAL CREAR/EDITAR ===
function abrirModalNuevo() {
    formTroquel.reset();
    document.getElementById('troquelId').value = '';
    document.getElementById('modalTitle').textContent = 'Registrar Nuevo Troquel';
    document.getElementById('fechaIngreso').value = hoy();
    document.getElementById('mantenimientoListaForm').innerHTML = '';
    imagenesTemp = [];
    renderPreviewImages();
    modalForm.classList.add('active');
}

function cerrarModalFormulario() {
    modalForm.classList.remove('active');
}

// === IMÁGENES Y DRAG & DROP ===
function initDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
    });

    dropZone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            procesarArchivos(files);
        }
    }, false);
}

function procesarArchivos(files) {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
        comprimirImagen(files[i], (base64) => {
            imagenesTemp.push(base64);
            renderPreviewImages();
        });
    }
}

function comprimirImagen(file, callback) {
    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const MAX = 800;
            let w = img.width, h = img.height;
            if (w > MAX || h > MAX) {
                if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                else { w = Math.round(w * MAX / h); h = MAX; }
            }
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function renderPreviewImages() {
    const container = document.getElementById('previewImages');
    container.innerHTML = '';
    imagenesTemp.forEach((base64, index) => {
        const div = document.createElement('div');
        div.className = 'preview-img-box';
        div.innerHTML = `<img src="${base64}" alt="preview"><button type="button" class="remove-btn" onclick="eliminarImagenTemp(${index})"><i class="fa-solid fa-times"></i></button>`;
        container.appendChild(div);
    });
}

function eliminarImagenTemp(index) {
    imagenesTemp.splice(index, 1);
    renderPreviewImages();
}

function limpiarFotosTemp() {
    imagenesTemp = [];
    document.getElementById('imagenesInput').value = '';
    renderPreviewImages();
}

// === HISTORIAL DE MANTENIMIENTO ===
function agregarEntradaMantenimiento(datos = null) {
    const container = document.getElementById('mantenimientoListaForm');
    const id = 'maint-' + Date.now() + Math.random().toString(16).slice(2);

    const div = document.createElement('div');
    div.className = 'maintenance-entry';
    div.id = id;

    let respOptions = `<option value="">-- Seleccionar --</option>`;
    catalogos.responsables.forEach(r => {
        const selected = (datos?.responsable_id == r.id) ? 'selected' : '';
        respOptions += `<option value="${r.id}" ${selected}>${r.nombre}</option>`;
    });

    div.innerHTML = `
        <button type="button" class="maint-remove-btn" onclick="eliminarEntradaMantenimiento('${id}')" title="Eliminar registro">
            <i class="fa-solid fa-trash-can"></i>
        </button>
        <div class="maint-form-grid">
            <div class="maint-photo-box" onclick="abrirSelectorFotoMantenimiento('${id}')" title="Haga clic para agregar una foto de este mantenimiento">
                <i class="fa-solid fa-camera"></i>
                <span>Foto</span>
                <img src="${datos?.foto || ''}" class="${datos?.foto ? '' : 'hidden'}" id="img-${id}">
            </div>
            <div class="maint-inputs-grid">
                <div class="form-group">
                    <label>Fecha</label>
                    <input type="date" class="maint-fecha" value="${datos?.fecha ? new Date(datos.fecha).toISOString().split('T')[0] : hoy()}">
                </div>
                <div class="form-group">
                    <label>Responsable</label>
                    <select class="maint-responsable_id">
                        ${respOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Costo ($)</label>
                    <input type="number" step="0.01" class="maint-costo" placeholder="0.00" value="${datos?.costo || ''}">
                </div>
                <div class="form-group" style="grid-column: 1 / -1">
                    <label>Trabajo Realizado</label>
                    <textarea class="maint-trabajo" placeholder="Describa el mantenimiento..." rows="2">${datos?.trabajo || ''}</textarea>
                </div>
            </div>
        </div>
    `;
    container.appendChild(div);
}

function eliminarEntradaMantenimiento(id) {
    document.getElementById(id).remove();
}

function abrirSelectorFotoMantenimiento(id) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            comprimirImagen(file, (base64) => {
                const img = document.getElementById('img-' + id);
                img.src = base64;
                img.classList.remove('hidden');
            });
        }
    };
    input.click();
}

function obtenerMantenimientoForm() {
    const entries = [];
    document.querySelectorAll('#mantenimientoListaForm .maintenance-entry').forEach(el => {
        const fecha = el.querySelector('.maint-fecha').value;
        const trabajo = el.querySelector('.maint-trabajo').value;
        const costo = parseFloat(el.querySelector('.maint-costo').value) || 0;
        const responsable_id = el.querySelector('.maint-responsable_id')?.value || null;
        const img = el.querySelector('.maint-photo-box img');
        const foto = img.classList.contains('hidden') ? null : img.src;

        if (fecha || trabajo || costo || responsable_id || foto) {
            entries.push({ fecha, trabajo, costo, responsable_id: parseInt(responsable_id) || null, foto });
        }
    });
    return entries;
}

// === GUARDAR TROQUEL ===
function guardarTroquel(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const referencia = document.getElementById('referencia').value.trim();
    const op = document.getElementById('op').value.trim();
    const cantidad = parseInt(document.getElementById('cantidad').value) || 0;
    const costoInput = document.getElementById('costo');
    const costoVal = parseFloat(costoInput.value) || 0;
    const editId = document.getElementById('troquelId').value;
    let errores = false;

    document.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));

    if (!nombre) { document.getElementById('grupoNombre').classList.add('has-error'); errores = true; }
    if (!referencia && !op) {
        document.getElementById('grupoReferencia').classList.add('has-error');
        document.getElementById('errorReferencia').textContent = 'Debe ingresar Referencia o OP.';
        errores = true;
    } else {
        if (referencia) {
            const duplicada = troqueles.find(t => t.referencia && t.referencia.toLowerCase() === referencia.toLowerCase() && t.id !== editId);
            if (duplicada) {
                document.getElementById('grupoReferencia').classList.add('has-error');
                document.getElementById('errorReferencia').textContent = 'Esta referencia ya existe.';
                errores = true;
            }
        }
    }
    if (cantidad < 0) { document.getElementById('grupoCantidad').classList.add('has-error'); errores = true; }

    if (costoVal < 0) {
        costoInput.closest('.form-group').classList.add('has-error');
        mostrarToast('El costo no puede ser negativo.', 'error');
        errores = true;
    }

    if (errores) {
        mostrarToast('Corrija los errores del formulario.', 'error');
        return;
    }

    const mantenimientos = obtenerMantenimientoForm();
    let estado = document.getElementById('estadoDepurado').value;

    // Si se añaden mantenimientos, el estado debería cambiar automáticamente a "En Mantenimiento" 
    // a menos que ya esté en ese estado o se haya marcado manualmente como tal.
    if (mantenimientos.length > 0 && estado === 'Activo') {
        estado = 'En Mantenimiento';
    }

    const id = editId || 'TRQ-' + Date.now();
    const nuevoTroquel = {
        id: id,
        nombre: nombre,
        referencia: referencia,
        op: op,
        cliente_id: parseInt(document.getElementById('cliente_id').value) || null,
        ubicacion: document.getElementById('ubicacion').value.trim() || null,
        proveedor_id: parseInt(document.getElementById('proveedor_id').value) || null,
        cantidad: cantidad,
        cavidades: parseInt(document.getElementById('cavidades').value) || 0,
        ancho: parseFloat(document.getElementById('ancho').value) || 0,
        profundo: parseFloat(document.getElementById('profundo').value) || 0,
        alto: parseFloat(document.getElementById('alto').value) || 0,
        costo: costoVal,
        fecha_ingreso: document.getElementById('fechaIngreso').value || hoy(),
        estado: estado,
        observaciones: document.getElementById('observaciones').value,
        imagenes: [...imagenesTemp],
        mantenimientos: mantenimientos
    };

    fetch(`${API_URL}/troqueles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoTroquel)
    })
        .then(res => res.json())
        .then(() => {
            mostrarToast(editId ? 'Troquel actualizado correctamente.' : 'Troquel registrado correctamente.', 'success');
            guardarDatos();
            cerrarModalFormulario();
        })
        .catch(err => {
            console.error('Error al guardar troquel:', err);
            mostrarToast('Error de conexión con el servidor.', 'error');
        });
}

// --- Restoration Functions ---
/**
 * Open restoration modal for a depurated troquel.
 */
function iniciarRestauracion(id) {
    console.log('Initiating restoration for troquel ID:', id);
    const modal = document.getElementById('modalRestauracion');
    if (!modal) {
        console.error('Modal Restauracion not found in DOM');
        return;
    }
    document.getElementById('restaurarTroquelId').value = id;
    const razonEl = document.getElementById('restaurarRazon');
    if (razonEl) {
        razonEl.value = '';
        razonEl.focus();
    }
    modal.classList.add('active');
    console.log('Modal should now be active');
}

function cerrarModalRestauracion() {
    const modal = document.getElementById('modalRestauracion');
    if (modal) modal.classList.remove('active');
    document.getElementById('modalRestauracion').classList.remove('active');
}

/**
 * Confirm restoration, send request to backend.
 */
function confirmarRestauracion() {
    const id = document.getElementById('restaurarTroquelId').value;
    const razon = document.getElementById('restaurarRazon').value.trim();
    // Reason is optional, so we send only if provided
    const payload = razon ? { razon_restauracion: razon } : {};
    fetch(`${API_URL}/troqueles/${id}/restaurar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(() => {
            mostrarToast('Troquel restaurado.', 'success');
            guardarDatos();
            cerrarModalRestauracion();
        })
        .catch(err => {
            console.error('Error al restaurar troquel:', err);
            mostrarToast('Error al restaurar.', 'error');
        });
}

/**
 * Placeholder function tied to restore button in table.
 * Opens the restoration modal.
 */
// Removed redundant async restoration function; modal flow handled by iniciarRestauracion and confirmarRestauracion.

function restaurarTroquel(id) {
    iniciarRestauracion(id);
}

function editarTroquel(id) {
    const troquel = troqueles.find(t => t.id === id);
    if (!troquel) return;

    document.getElementById('modalTitle').textContent = 'Editar Troquel';
    document.getElementById('troquelId').value = troquel.id;
    document.getElementById('nombre').value = troquel.nombre;
    document.getElementById('referencia').value = troquel.referencia || '';
    document.getElementById('op').value = troquel.op || '';
    document.getElementById('cliente_id').value = troquel.cliente_id || '';
    document.getElementById('ubicacion').value = troquel.ubicacion || '';
    document.getElementById('cantidad').value = troquel.cantidad;
    document.getElementById('cavidades').value = troquel.cavidades;
    document.getElementById('ancho').value = troquel.ancho || 0;
    document.getElementById('profundo').value = troquel.profundo || 0;
    document.getElementById('alto').value = troquel.alto || 0;
    document.getElementById('costo').value = troquel.costo;
    document.getElementById('proveedor_id').value = troquel.proveedor_id || '';
    document.getElementById('fechaIngreso').value = troquel.fecha_ingreso ? troquel.fecha_ingreso.split('T')[0] : '';
    document.getElementById('estadoDepurado').value = troquel.estado || 'Activo';
    document.getElementById('observaciones').value = troquel.observaciones || '';

    // Mantenimientos
    const maintContainer = document.getElementById('mantenimientoListaForm');
    maintContainer.innerHTML = '';
    if (troquel.mantenimientos) {
        troquel.mantenimientos.forEach(m => agregarEntradaMantenimiento(m));
    }

    imagenesTemp = [...(troquel.imagenes || [])];
    renderPreviewImages();
    modalForm.classList.add('active');
}

// === FLUJO DE DEPURACIÓN ===
function iniciarDepuracion(id) {
    // Eliminamos el confirm() que puede ser bloqueado por algunos navegadores
    document.getElementById('depTroquelId').value = id;
    document.getElementById('depFecha').value = hoy();
    document.getElementById('depRazon').value = '';
    document.getElementById('grupoRazon').classList.remove('has-error');
    document.getElementById('modalDepuracion').classList.add('active');
}

function cerrarModalDepuracion() {
    document.getElementById('modalDepuracion').classList.remove('active');
}

function confirmarDepuracion() {
    const razon = document.getElementById('depRazon').value.trim();
    if (!razon) {
        document.getElementById('grupoRazon').classList.add('has-error');
        mostrarToast('La razón es obligatoria.', 'error');
        return;
    }

    const id = document.getElementById('depTroquelId').value;
    const troquel = troqueles.find(t => t.id === id);
    if (!troquel) return;

    const datosDepuracion = {
        ...troquel,
        estado: 'Depurado',
        fecha_depuracion: document.getElementById('depFecha').value || hoy(),
        razon_depuracion: razon
    };

    fetch(`${API_URL}/troqueles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosDepuracion)
    })
        .then(res => res.json())
        .then(() => {
            mostrarToast('Troquel depurado correctamente.', 'warning');
            guardarDatos();
            cerrarModalDepuracion();
        })
        .catch(err => {
            console.error('Error al depurar:', err);
            mostrarToast('Error al conectar con el servidor.', 'error');
        });
}

// === RESTAURAR Y ELIMINAR ===
function ejecutarRestauracion(id) {
    iniciarRestauracion(id);
}

async function eliminarDefinitivamente(id) {
    if (!confirm('¿Eliminar PERMANENTEMENTE? Esta acción no se puede deshacer.')) return;

    try {
        const response = await fetch(`${API_URL}/troqueles/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            mostrarToast('Troquel eliminado permanentemente.', 'error');
            guardarDatos();
        }
    } catch (err) {
        console.error('Error al eliminar:', err);
        mostrarToast('Error al conectar con el servidor.', 'error');
    }
}

// === VER DETALLE ===
/**
 * Muestra el modal con la hoja de vida detallada del troquel.
 */
function verDetalle(id) {
    troquelActivoId = id;
    const troquel = troqueles.find(t => t.id === id);
    if (!troquel) return;

    document.getElementById('detNombre').textContent = troquel.nombre;
    document.getElementById('detRef').textContent = troquel.referencia || 'SIN REF';
    const detOp = document.getElementById('detOp');
    if (troquel.op) {
        detOp.textContent = troquel.op;
        detOp.style.display = 'inline-block';
    } else {
        detOp.style.display = 'none';
    }
    document.getElementById('detCliente').textContent = troquel.cliente_nombre || 'N/A';
    document.getElementById('detUbicacion').textContent = troquel.ubicacion || 'N/A';
    document.getElementById('detCantidad').textContent = troquel.cantidad;
    document.getElementById('detCavidades').textContent = troquel.cavidades;
    document.getElementById('detAncho').textContent = troquel.ancho || 0;
    document.getElementById('detProfundo').textContent = troquel.profundo || 0;
    document.getElementById('detAlto').textContent = troquel.alto || 0;
    document.getElementById('detCosto').textContent = troquel.costo ? formatCurrency(Number(troquel.costo)) : 'N/A';
    document.getElementById('detProveedor').textContent = troquel.proveedor_nombre || 'N/A';
    document.getElementById('detFechaIngreso').textContent = formatearFecha(troquel.fecha_ingreso) || 'N/A';

    const estadoEl = document.getElementById('detEstado');
    estadoEl.textContent = troquel.estado || 'Activo';
    estadoEl.className = 'value badge-status';
    if (troquel.estado === 'En Mantenimiento') estadoEl.classList.add('status-mantenimiento');
    else if (troquel.estado === 'Depurado') estadoEl.classList.add('status-depurado');
    else estadoEl.classList.add('status-activo');

    // Depuración
    const depSection = document.getElementById('detDepuracionSection');
    if (troquel.estado === 'Depurado' && troquel.fecha_depuracion) {
        depSection.style.display = 'block';
        document.getElementById('detFechaDepuracion').textContent = formatearFecha(troquel.fecha_depuracion) || 'N/A';
        document.getElementById('detRazonDepuracion').textContent = troquel.razon_depuracion || 'N/A';
    } else {
        depSection.style.display = 'none';
    }

    // Restauración
    const restSection = document.getElementById('detRestauracionSection');
    if (restSection) {
        if (troquel.estado !== 'Depurado' && (troquel.fecha_restauracion || troquel.razon_restauracion)) {
            restSection.style.display = 'block';
            document.getElementById('detFechaRestauracion').textContent = formatearFecha(troquel.fecha_restauracion) || 'N/A';
            document.getElementById('detRazonRestauracion').textContent = troquel.razon_restauracion || 'Sin justificación';
        } else {
            restSection.style.display = 'none';
        }
    }

    // Observaciones
    const notasSection = document.getElementById('detNotasSection');
    if (troquel.observaciones && troquel.observaciones.trim()) {
        notasSection.style.display = 'block';
        document.getElementById('detObservaciones').textContent = troquel.observaciones;
    } else {
        notasSection.style.display = 'none';
    }

    // Mantenimiento
    const maintSection = document.getElementById('detMantenimientoSection');
    const maintLista = document.getElementById('detMantenimientoLista');
    maintLista.innerHTML = '';
    if (troquel.mantenimientos && troquel.mantenimientos.length > 0) {
        maintSection.style.display = 'block';
        troquel.mantenimientos.forEach(m => {
            const item = document.createElement('div');
            item.className = 'maint-timeline-item';
            item.innerHTML = `
                <div class="maint-timeline-item">
                    <div class="maint-date">${formatearFecha(m.fecha)}</div>
                    <div class="maint-desc"><strong>Trabajo:</strong> ${escapeHTML(m.trabajo)}</div>
                    <div class="maint-meta"><strong>Responsable:</strong> ${escapeHTML(m.responsable_nombre || 'N/A')} | <strong>Costo:</strong> ${formatCurrency(Number(m.costo) || 0)}</div>
                </div>
            `;
            maintLista.appendChild(item);
        });
    } else {
        maintSection.style.display = 'none';
    }

    // Galería
    const galeria = document.getElementById('detGaleria');
    galeria.innerHTML = '';
    lightboxImages = [];
    if (troquel.imagenes && troquel.imagenes.length > 0) {
        lightboxImages = [...troquel.imagenes];
        troquel.imagenes.forEach((img, idx) => {
            const imageEl = document.createElement('img');
            imageEl.src = img;
            imageEl.alt = `Imagen ${idx + 1} de ${escapeHTML(troquel.nombre)}`;
            imageEl.loading = "lazy";
            imageEl.onclick = () => abrirLightbox(idx);
            galeria.appendChild(imageEl);
        });
    } else {
        galeria.innerHTML = '<p class="text-light">No hay imágenes registradas para este troquel.</p>';
    }

    modalDetalle.classList.add('active');
}

function cerrarModalDetalle() {
    modalDetalle.classList.remove('active');
}

// === LIGHTBOX ===
function abrirLightbox(index) {
    lightboxIndex = index;
    document.getElementById('lightboxImg').src = lightboxImages[index];
    document.getElementById('lightbox').classList.add('active');
}

function cerrarLightbox() {
    document.getElementById('lightbox').classList.remove('active');
}

// === EXPORTAR EXCEL ===
function exportarExcel() {
    try {
        if (typeof XLSX === 'undefined') {
            mostrarToast('Error: Biblioteca Excel no cargada. Verifique su conexión.', 'error');
            return;
        }

        const datosExportar = obtenerDatosFiltrados();
        if (datosExportar.length === 0) {
            mostrarToast('No hay datos para exportar.', 'warning');
            return;
        }

        mostrarToast('Generando archivo Excel...', 'info');

        const datosExcel = datosExportar.map(t => ({
            Nombre: t.nombre,
            Referencia: t.referencia || '-',
            OP: t.op || '-',
            Cliente: t.cliente_nombre || '-',
            Ubicación: t.ubicacion || '-',
            Cantidad: t.cantidad,
            'Costo Unit. ($)': t.costo || 0,
            'Valor Total ($)': (t.cantidad || 0) * (t.costo || 0),
            Cavidades: t.cavidades || 1,
            'Ancho (mm)': t.ancho || 0,
            'Profundo (mm)': t.profundo || 0,
            'Alto (mm)': t.alto || 0,
            Proveedor: t.proveedor_nombre || '-',
            'Fecha Ingreso': formatearFecha(t.fecha_ingreso),
            Estado: t.estado || 'Activo',
            'N° Mantenimientos': (t.mantenimientos || []).length
        }));

        const worksheet = XLSX.utils.json_to_sheet(datosExcel);
        const workbook = XLSX.utils.book_new();
        const sheetName = pestanaActual === 'activos' ? "Activos" : "Depurados";
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSX.writeFile(workbook, `Inventario_Troqueles_${sheetName}.xlsx`);

        mostrarToast('Excel descargado correctamente.', 'success');
    } catch (error) {
        console.error('Excel Export Error:', error);
        mostrarToast('Error al generar el Excel.', 'error');
    }
}

// === EXPORTAR PDF ===
function exportarDetallePDF() {
    try {
        if (typeof window.jspdf === 'undefined') {
            mostrarToast('Error: Biblioteca jsPDF no cargada.', 'error');
            return;
        }

        if (!troquelActivoId) {
            mostrarToast('No se ha seleccionado ningún troquel.', 'warning');
            return;
        }

        const troquel = troqueles.find(t => t.id === troquelActivoId);
        if (!troquel) {
            mostrarToast('Troquel no encontrado.', 'error');
            return;
        }

        mostrarToast('Generando Ficha Técnica PDF...', 'info');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const marginL = 14;
        const marginR = pageW - 14;
        const contentW = marginR - marginL;
        let y = 14;

        const valorTotal = (Number(troquel.cantidad) || 0) * (Number(troquel.costo) || 0);
        const fechaStr = new Date().toLocaleDateString('es-CO') + '  ' + new Date().toLocaleTimeString('es-CO');

        // ── ENCABEZADO ──────────────────────────────────────────
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(marginL, y, contentW, 18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('FICHA TÉCNICA DE TROQUEL', pageW / 2, y + 7, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Generado el: ' + fechaStr, pageW / 2, y + 13, { align: 'center' });
        y += 24;

        // ── TÍTULO SECCIÓN ─────────────────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Información del Troquel', marginL, y);
        y += 4;

        // ── TABLA DE DATOS ─────────────────────────────────────
        const filas = [
            ['Nombre', troquel.nombre || '-', 'Ref / OP', (troquel.referencia || '-') + ' / ' + (troquel.op || '-')],
            ['Cliente', troquel.cliente_nombre || 'N/A', 'Ubicación', troquel.ubicacion || 'N/A'],
            ['Proveedor', troquel.proveedor_nombre || 'N/A', 'Fecha Ingreso', formatearFecha(troquel.fecha_ingreso) || 'N/A'],
            ['Cantidad', String(troquel.cantidad || 0), 'Cavidades', String(troquel.cavidades || 0)],
            ['Ancho (mm)', String(troquel.ancho || 0), 'Profundo (mm)', String(troquel.profundo || 0)],
            ['Alto (mm)', String(troquel.alto || 0), '', ''],
            ['Costo Unitario', '$' + (troquel.costo || 0).toLocaleString(), 'Valor Total', '$' + valorTotal.toLocaleString()],
            ['Estado', troquel.estado || 'Activo', '', '']
        ];

        const colW = contentW / 4;
        const rowH = 8;

        filas.forEach((fila, ri) => {
            // Fila de 4 columnas: [label1, val1, label2, val2]
            for (let ci = 0; ci < 4; ci++) {
                const x = marginL + ci * colW;
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                doc.rect(x, y, colW, rowH);

                const isLabel = ci === 0 || ci === 2;
                doc.setFont('helvetica', isLabel ? 'bold' : 'normal');
                doc.setFontSize(9);
                doc.setTextColor(0);

                const cellText = fila[ci] || '';
                // Si es la última fila y columna 2-3 vacías, hacer colspan visual
                doc.text(cellText, x + 2, y + 5, { maxWidth: colW - 4 });
            }
            y += rowH;
        });
        y += 6;

        // ── OBSERVACIONES ──────────────────────────────────────
        if (troquel.observaciones && troquel.observaciones.trim()) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Observaciones', marginL, y);
            y += 4;

            const obsLines = doc.splitTextToSize(troquel.observaciones, contentW - 4);
            const obsH = Math.max(14, obsLines.length * 5 + 6);
            doc.setLineWidth(0.3);
            doc.rect(marginL, y, contentW, obsH);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(obsLines, marginL + 2, y + 5);
            y += obsH + 6;
        }

        // ── INFORMACIÓN DE DEPURACIÓN ──────────────────────────
        if (troquel.estado === 'Depurado' && troquel.fecha_depuracion) {
            const depFechaStr = `Fecha de Depuración: ${formatearFecha(troquel.fecha_depuracion) || 'N/A'}`;
            const razonDep = troquel.razon_depuracion || 'N/A';
            const razonLines = doc.splitTextToSize(`Razón: ${razonDep}`, contentW - 4);
            const depH = 10 + razonLines.length * 5;

            if (y + depH + 6 > pageH - 20) { doc.addPage(); y = 14; }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Información de Depuración', marginL, y);
            y += 4;

            doc.setLineWidth(0.3);
            doc.rect(marginL, y, contentW, depH);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(depFechaStr, marginL + 2, y + 5);
            doc.text(razonLines, marginL + 2, y + 10);
            y += depH + 6;
        }

        // ── INFORMACIÓN DE RESTAURACIÓN ────────────────────────
        if (troquel.estado !== 'Depurado' && (troquel.fecha_restauracion || troquel.razon_restauracion)) {
            const restFechaStr = `Fecha de Restauración: ${formatearFecha(troquel.fecha_restauracion) || 'N/A'}`;
            const razonRest = troquel.razon_restauracion || 'Sin justificación';
            const razonRestLines = doc.splitTextToSize(`Razón de Restauración: ${razonRest}`, contentW - 4);
            const restH = 10 + razonRestLines.length * 5;

            if (y + restH + 6 > pageH - 20) { doc.addPage(); y = 14; }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Información de Restauración', marginL, y);
            y += 4;

            doc.setLineWidth(0.3);
            doc.rect(marginL, y, contentW, restH);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(restFechaStr, marginL + 2, y + 5);
            doc.text(razonRestLines, marginL + 2, y + 10);
            y += restH + 6;
        }

        // ── HISTORIAL DE MANTENIMIENTO ─────────────────────────
        if (troquel.mantenimientos && troquel.mantenimientos.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Historial de Mantenimiento', marginL, y);
            y += 4;

            doc.autoTable({
                startY: y,
                margin: { left: marginL, right: 14 },
                head: [['Fecha', 'Costo', 'Trabajo Realizado', 'Responsable']],
                body: troquel.mantenimientos.map(m => [
                    formatearFecha(m.fecha) || '-',
                    '$' + (m.costo || 0).toLocaleString(),
                    m.trabajo || m.descripcion || '-',
                    m.responsable || '-'
                ]),
                styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3 },
                headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.3 },
                alternateRowStyles: { fillColor: [255, 255, 255] },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 22 },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 30 }
                }
            });
            y = doc.lastAutoTable.finalY + 6;
        }

        // ── IMAGEN DEL TROQUEL ─────────────────────────────────
        const _addImagesAndSave = () => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);

            if (troquel.imagenes && troquel.imagenes.length > 0) {
                // Verificar si cabe en la página actual, si no, nueva página
                if (y + 14 > pageH - 20) { doc.addPage(); y = 14; }
                doc.text('Imágenes del Troquel', marginL, y);
                y += 5;

                troquel.imagenes.forEach((imgData, idx) => {
                    try {
                        // Detectar formato
                        let fmt = 'JPEG';
                        if (imgData.startsWith('data:image/png')) fmt = 'PNG';

                        const maxImgW = contentW;
                        const maxImgH = 90;

                        // Calcular dimensiones proporcionales
                        const tmpImg = new Image();
                        tmpImg.src = imgData;
                        let iw = tmpImg.naturalWidth || 800;
                        let ih = tmpImg.naturalHeight || 600;
                        let ratio = Math.min(maxImgW / iw, maxImgH / ih);
                        let fw = iw * ratio;
                        let fh = ih * ratio;

                        if (y + fh + 4 > pageH - 20) { doc.addPage(); y = 14; }

                        doc.setLineWidth(0.3);
                        doc.rect(marginL, y, fw, fh);
                        doc.addImage(imgData, fmt, marginL, y, fw, fh);
                        y += fh + 5;
                    } catch (imgErr) {
                        console.warn('No se pudo incrustar imagen', idx, imgErr);
                    }
                });
            } else {
                if (y + 10 > pageH - 20) { doc.addPage(); y = 14; }
                doc.text('Imágenes del Troquel', marginL, y);
                y += 5;
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(9);
                doc.text('Este troquel no tiene imágenes registradas.', marginL, y);
            }

            // ── PIE DE PÁGINA ──────────────────────────────────
            const totalPages = doc.internal.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(100);
                doc.text('Generado el: ' + fechaStr, marginL, pageH - 8);
                doc.text('Página ' + p + ' de ' + totalPages, marginR, pageH - 8, { align: 'right' });
            }

            const filename = 'Ficha_Tecnica_' + (troquel.nombre || 'troquel').replace(/[^a-z0-9]/gi, '_') + '.pdf';
            doc.save(filename);
            mostrarToast('PDF descargado exitosamente.', 'success');
        };

        // Esperar a que las imágenes estén disponibles si son base64
        if (troquel.imagenes && troquel.imagenes.length > 0) {
            const loaders = troquel.imagenes.map(src => new Promise(res => {
                const img = new Image();
                img.onload = res;
                img.onerror = res;
                img.src = src;
            }));
            Promise.all(loaders).then(_addImagesAndSave);
        } else {
            _addImagesAndSave();
        }

    } catch (error) {
        console.error('Error PDF:', error);
        mostrarToast('Error en exportación.', 'error');
    }
}


// Fallback de impresión nativa mejorada
function imprimirPantalla() {
    const tituloHoja = pestanaActual === 'activos' ? "ACTIVOS" : "DEPURADOS";
    const datosCompletos = obtenerDatosFiltrados();

    const paginaPrevia = paginaActual;

    // Renderizar TODA la lista con VALOR TOTAL para impresión
    renderTabla(datosCompletos, true, true);

    const printHeader = document.querySelector('.print-header');
    if (printHeader) {
        printHeader.style.display = 'block';
        document.getElementById('printDate').textContent = getLongDate();
        document.getElementById('printEstado').textContent = tituloHoja;
        document.getElementById('printBodega').textContent = "PRINCIPAL";
    }

    // Calcular y mostrar resumen de costos
    const sumatoria = datosCompletos.reduce((acc, t) => acc + ((Number(t.cantidad) || 0) * (Number(t.costo) || 0)), 0);
    const summaryDiv = document.getElementById('printSummary');
    if (summaryDiv) {
        summaryDiv.style.display = 'block';
        summaryDiv.textContent = `Valor Total General: ${formatCurrency(sumatoria)}`;
    }

    mostrarToast('Preparando listado con Valores Totales para imprimir...', 'info');

    setTimeout(() => {
        window.print();

        if (printHeader) printHeader.style.display = 'none';
        if (summaryDiv) summaryDiv.style.display = 'none';
        paginaActual = paginaPrevia;
        actualizarVista();
    }, 500);
}

function exportarListaPDF() {
    try {
        if (typeof window.jspdf === 'undefined') {
            mostrarToast('Error: Biblioteca jsPDF no cargada.', 'error');
            return;
        }

        const datosParaPDF = obtenerDatosFiltrados();

        if (!datosParaPDF || datosParaPDF.length === 0) {
            mostrarToast('No hay datos en la lista actual para exportar.', 'warning');
            return;
        }

        mostrarToast('Generando reporte PDF...', 'info');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const marginL = 10;
        const marginR = pageW - 10;
        const tituloHoja = pestanaActual === 'activos' ? 'ACTIVOS' : 'DEPURADOS';
        const fechaStr = new Date().toLocaleDateString('es-CO') + '  ' + new Date().toLocaleTimeString('es-CO');
        const sumatoria = datosParaPDF.reduce((acc, t) => acc + ((Number(t.cantidad) || 0) * (Number(t.costo) || 0)), 0);

        // ── ENCABEZADO ──────────────────────────────────────────
        let y = 12;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('LISTADO DE TROQUELES', pageW / 2, y, { align: 'center' });
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(getLongDate(), pageW / 2, y, { align: 'center' });
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Bodega: PRINCIPAL  |  Estado: ' + tituloHoja, pageW / 2, y, { align: 'center' });
        y += 6;

        // ── TABLA ───────────────────────────────────────────────
        const filas = datosParaPDF.map(t => [
            t.nombre || '-',
            t.referencia || '-',
            t.op || '-',
            t.cliente_nombre || '-',
            t.ubicacion || '-',
            formatearFecha(t.fecha_ingreso) || '-',
            String(t.cantidad || 0),
            formatCurrency(t.costo || 0),
            formatCurrency((Number(t.cantidad) || 0) * (Number(t.costo) || 0)),
            t.estado || 'Activo'
        ]);

        doc.autoTable({
            startY: y,
            margin: { left: marginL, right: 10 },
            head: [['Nombre', 'Referencia', 'OP', 'Cliente', 'Ubicación', 'Fecha Ingr.', 'Cant.', 'Costo', 'Total', 'Estado']],
            body: filas,
            styles: {
                fontSize: 8,
                textColor: [0, 0, 0],
                lineColor: [0, 0, 0],
                lineWidth: 0.3,
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineColor: [0, 0, 0],
                lineWidth: 0.3
            },
            alternateRowStyles: { fillColor: [255, 255, 255] },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 28 },
                2: { cellWidth: 35 },
                3: { cellWidth: 30 },
                4: { cellWidth: 14, halign: 'center' },
                5: { cellWidth: 22, halign: 'right' },
                6: { cellWidth: 22, halign: 'right' },
                7: { cellWidth: 22, halign: 'center' }
            }
        });

        const finalY = doc.lastAutoTable.finalY + 5;

        // ── TOTAL GENERAL ─────────────────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.text('Valor Total del Inventario: ' + formatCurrency(sumatoria), marginR, finalY, { align: 'right' });

        // ── PIE DE PÁGINA ─────────────────────────────────────
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100);
            doc.text('Generado el: ' + fechaStr, marginL, pageH - 6);
            doc.text('Página ' + p + ' de ' + totalPages, marginR, pageH - 6, { align: 'right' });
        }

        doc.save('Reporte_Inventario_' + tituloHoja + '.pdf');
        mostrarToast('PDF descargado exitosamente.', 'success');

    } catch (error) {
        console.error('Error PDF lista:', error);
        mostrarToast('Error al generar PDF.', 'error');
    }
}

// === GESTIÓN DE CATÁLOGOS (UI) ===
function abrirModalCatalogos() {
    document.getElementById('modalCatalogos').classList.add('active');
    verCatalogo('clientes');
}

function cerrarModalCatalogos() {
    document.getElementById('modalCatalogos').classList.remove('active');
}

function verCatalogo(tipo) {
    catalogoActual = tipo;

    // Actualizar tabs
    document.querySelectorAll('.cat-tab').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === tipo);
    });

    // Actualizar título de formulario
    const titulos = { clientes: 'Cliente', proveedores: 'Proveedor', responsables: 'Responsable' };
    document.getElementById('catFormTitle').textContent = `Agregar Nuevo ${titulos[tipo]}`;

    // Renderizar inputs según el catálogo
    const container = document.getElementById('catInputs');
    container.innerHTML = `
        <div class="form-group">
            <label>Nombre del ${titulos[tipo]} *</label>
            <input type="text" id="catNombre" required>
        </div>
    `;

    if (tipo === 'clientes' || tipo === 'proveedores' || tipo === 'responsables') {
        let labelExtra = 'Información';
        if (tipo === 'clientes') labelExtra = 'Contacto';
        else if (tipo === 'proveedores') labelExtra = 'NIT';
        else if (tipo === 'responsables') labelExtra = 'Cargo';

        container.innerHTML += `
            <div class="form-group mt-2">
                <label>${labelExtra}</label>
                <input type="text" id="catExtra">
            </div>
        `;
    }

    renderListaCatalogo();
}

function renderListaCatalogo() {
    const lista = document.getElementById('listaCatalogo');
    lista.innerHTML = '';
    const datos = catalogos[catalogoActual];

    if (!datos) return;

    datos.forEach(item => {
        const tr = document.createElement('tr');

        let detalle = '-';
        if (catalogoActual === 'clientes') detalle = item.contacto || '-';
        else if (catalogoActual === 'proveedores') detalle = item.nit || '-';
        else if (catalogoActual === 'responsables') detalle = item.cargo || '-';

        tr.innerHTML = `
            <td>${escapeHTML(item.nombre)}</td>
            <td>${escapeHTML(detalle)}</td>
            <td>
                <button class="btn-icon delete" onclick="eliminarRegistroCatalogo(${item.id})" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        lista.appendChild(tr);
    });
}

async function guardarRegistroCatalogo(e) {
    e.preventDefault();
    const nombre = document.getElementById('catNombre').value.trim();
    const extra = document.getElementById('catExtra')?.value || '';

    if (!nombre) return;

    const body = { nombre };
    if (catalogoActual === 'clientes') body.contacto = extra;
    if (catalogoActual === 'proveedores') body.nit = extra;
    if (catalogoActual === 'responsables') body.cargo = extra;

    try {
        const response = await fetch(`${API_URL}/${catalogoActual}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            mostrarToast('Registro guardado.', 'success');
            await cargarCatalogos();
            verCatalogo(catalogoActual);
            document.getElementById('formCatalogo').reset();
        }
    } catch (err) {
        mostrarToast('Error al guardar.', 'error');
    }
}

async function eliminarRegistroCatalogo(id) {
    if (!confirm('¿Desea eliminar este registro? Los troqueles asociados quedarán sin esta referencia.')) return;

    try {
        const response = await fetch(`${API_URL}/${catalogoActual}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            mostrarToast('Registro eliminado.', 'success');
            await cargarCatalogos();
            verCatalogo(catalogoActual);
            await cargarDatos();
            actualizarVista();
        } else {
            const errData = await response.json();
            mostrarToast(`Error al eliminar: ${errData.error || 'error desconocido'}`, 'error');
        }
    } catch (err) {
        console.error('Error al eliminar registro de catálogo:', err);
        mostrarToast('Error al conectar con el servidor.', 'error');
    }
}

// === TEMA ===
function initTheme() {
    const savedTheme = localStorage.getItem('troquelesApp_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    actualizarIconoTema(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('troquelesApp_theme', newTheme);
    actualizarIconoTema(newTheme);
}

function actualizarIconoTema(theme) {
    const btnIcon = document.querySelector('#themeToggleBtn i');
    if (btnIcon) {
        btnIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        document.getElementById('themeToggleBtn').style.color = theme === 'dark' ? '#fbbf24' : 'var(--dark)';
    }
}
