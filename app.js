let troqueles = JSON.parse(localStorage.getItem('troquelesApp_data')) || [];
let imagenesTemp = [];
let pestanaActual = 'activos'; // 'activos' o 'depurados'

const listaTroqueles = document.getElementById('listaTroqueles');
const statActivos = document.getElementById('statActivos');
const statDepurados = document.getElementById('statDepurados');
const emptyState = document.getElementById('emptyState');
const troquelesTable = document.getElementById('troquelesTable');
const searchInput = document.getElementById('searchInput');

const modalForm = document.getElementById('modalFormulario');
const modalDetalle = document.getElementById('modalDetalle');
const formTroquel = document.getElementById('formTroquel');

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    actualizarVista();
    
    searchInput.addEventListener('input', () => {
        actualizarVista();
    });

    document.getElementById('imagenesInput').addEventListener('change', procesarImagenes);
});

function cambiarPestana(pestana) {
    pestanaActual = pestana;
    
    // Actualizar UI de pestañas
    document.getElementById('tabActivos').classList.toggle('active', pestana === 'activos');
    document.getElementById('tabDepurados').classList.toggle('active', pestana === 'depurados');
    
    // Limpiar búsqueda al cambiar de pestaña (opcional, pero buena práctica)
    searchInput.value = '';
    
    actualizarVista();
}

function obtenerDatosFiltrados() {
    const query = searchInput.value.toLowerCase();
    
    // 1. Filtrar por pestaña
    let filtradosPorPestana = troqueles.filter(t => {
        const esDepurado = (t.estadoDepurado === 'Depurado');
        if (pestanaActual === 'activos') return !esDepurado;
        return esDepurado; // pestanaActual === 'depurados'
    });

    // 2. Filtrar por búsqueda
    if (query.trim() !== '') {
        filtradosPorPestana = filtradosPorPestana.filter(t => 
            t.nombre.toLowerCase().includes(query) || 
            (t.cliente && t.cliente.toLowerCase().includes(query)) || 
            t.referencia.toLowerCase().includes(query)
        );
    }
    return filtradosPorPestana;
}

function actualizarVista() {
    // Actualizar Estadísticas Generales
    const totalesActivos = troqueles.filter(t => t.estadoDepurado !== 'Depurado').length;
    const totalesDepurados = troqueles.filter(t => t.estadoDepurado === 'Depurado').length;
    
    statActivos.textContent = totalesActivos;
    statDepurados.textContent = totalesDepurados;

    // Renderizar tabla
    const datosARenderizar = obtenerDatosFiltrados();
    renderTabla(datosARenderizar);
}

function guardarDatos() {
    localStorage.setItem('troquelesApp_data', JSON.stringify(troqueles));
    actualizarVista();
}

function renderTabla(datos) {
    listaTroqueles.innerHTML = '';

    if (datos.length === 0) {
        troquelesTable.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    troquelesTable.style.display = 'table';
    emptyState.style.display = 'none';

    datos.forEach(troquel => {
        const tr = document.createElement('tr');
        const portada = troquel.imagenes && troquel.imagenes.length > 0 ? troquel.imagenes[0] : 'https://via.placeholder.com/50?text=No+Img';
        
        let claseEstado = 'status-activo';
        if (troquel.estadoDepurado === 'En Mantenimiento') claseEstado = 'status-mantenimiento';
        if (troquel.estadoDepurado === 'Depurado') claseEstado = 'status-depurado';

        tr.innerHTML = `
            <td class="no-print"><img src="${portada}" class="img-thumbnail" alt="Troquel"></td>
            <td><strong>${troquel.nombre}</strong></td>
            <td>${troquel.referencia}</td>
            <td>${troquel.cliente || '-'}</td>
            <td>${troquel.ubicacion || '-'}</td>
            <td>${troquel.cantidad}</td>
            <td><span class="badge-status ${claseEstado}">${troquel.estadoDepurado || 'Activo'}</span></td>
            <td class="no-print">
                <button class="btn-icon view" onclick="verDetalle('${troquel.id}')" title="Ver Detalle"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-icon edit" onclick="editarTroquel('${troquel.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" onclick="eliminarTroquel('${troquel.id}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        listaTroqueles.appendChild(tr);
    });
}

function abrirModalNuevo() {
    formTroquel.reset();
    document.getElementById('troquelId').value = '';
    document.getElementById('modalTitle').textContent = 'Registrar Nuevo Troquel';
    imagenesTemp = [];
    renderPreviewImages();
    modalForm.classList.add('active');
}

function cerrarModalFormulario() {
    modalForm.classList.remove('active');
}

function procesarImagenes(e) {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = function(event) {
            imagenesTemp.push(event.target.result);
            renderPreviewImages();
        };
        reader.readAsDataURL(files[i]);
    }
}

function renderPreviewImages() {
    const container = document.getElementById('previewImages');
    container.innerHTML = '';
    imagenesTemp.forEach((base64, index) => {
        const div = document.createElement('div');
        div.className = 'preview-img-box';
        div.innerHTML = `
            <img src="${base64}" alt="preview">
            <button type="button" class="remove-btn" onclick="eliminarImagenTemp(${index})"><i class="fa-solid fa-times"></i></button>
        `;
        container.appendChild(div);
    });
}

function eliminarImagenTemp(index) {
    imagenesTemp.splice(index, 1);
    renderPreviewImages();
}

function guardarTroquel(e) {
    e.preventDefault();
    const id = document.getElementById('troquelId').value || 'TRQ-' + Date.now();
    
    const nuevoTroquel = {
        id: id,
        nombre: document.getElementById('nombre').value,
        referencia: document.getElementById('referencia').value,
        cliente: document.getElementById('cliente').value,
        ubicacion: document.getElementById('ubicacion').value,
        cantidad: parseInt(document.getElementById('cantidad').value) || 0,
        cavidades: parseInt(document.getElementById('cavidades').value) || 0,
        costo: parseFloat(document.getElementById('costo').value) || 0,
        proveedor: document.getElementById('proveedor').value,
        fechaIngreso: document.getElementById('fechaIngreso').value,
        estadoDepurado: document.getElementById('estadoDepurado').value,
        fechaDepuracion: document.getElementById('fechaDepuracion').value,
        imagenes: [...imagenesTemp]
    };

    const index = troqueles.findIndex(t => t.id === id);
    if (index !== -1) { troqueles[index] = nuevoTroquel; } 
    else { troqueles.unshift(nuevoTroquel); }

    guardarDatos();
    cerrarModalFormulario();
}

function editarTroquel(id) {
    const troquel = troqueles.find(t => t.id === id);
    if (!troquel) return;

    document.getElementById('modalTitle').textContent = 'Editar Troquel';
    document.getElementById('troquelId').value = troquel.id;
    document.getElementById('nombre').value = troquel.nombre;
    document.getElementById('referencia').value = troquel.referencia;
    document.getElementById('cliente').value = troquel.cliente;
    document.getElementById('ubicacion').value = troquel.ubicacion;
    document.getElementById('cantidad').value = troquel.cantidad;
    document.getElementById('cavidades').value = troquel.cavidades;
    document.getElementById('costo').value = troquel.costo;
    document.getElementById('proveedor').value = troquel.proveedor;
    document.getElementById('fechaIngreso').value = troquel.fechaIngreso;
    document.getElementById('estadoDepurado').value = troquel.estadoDepurado || 'Activo';
    document.getElementById('fechaDepuracion').value = troquel.fechaDepuracion;
    
    imagenesTemp = [...(troquel.imagenes || [])];
    renderPreviewImages();

    modalForm.classList.add('active');
}

function eliminarTroquel(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este troquel? Esta acción no se puede deshacer.')) {
        troqueles = troqueles.filter(t => t.id !== id);
        guardarDatos();
    }
}

function verDetalle(id) {
    const troquel = troqueles.find(t => t.id === id);
    if (!troquel) return;

    document.getElementById('detNombre').textContent = troquel.nombre;
    document.getElementById('detRef').textContent = troquel.referencia;
    document.getElementById('detCliente').textContent = troquel.cliente || 'N/A';
    document.getElementById('detUbicacion').textContent = troquel.ubicacion || 'N/A';
    document.getElementById('detCantidad').textContent = troquel.cantidad;
    document.getElementById('detCavidades').textContent = troquel.cavidades;
    document.getElementById('detCosto').textContent = troquel.costo ? `$${troquel.costo}` : 'N/A';
    document.getElementById('detProveedor').textContent = troquel.proveedor || 'N/A';
    document.getElementById('detFechaIngreso').textContent = troquel.fechaIngreso || 'N/A';
    
    const estadoEl = document.getElementById('detEstado');
    estadoEl.textContent = troquel.estadoDepurado || 'Activo';
    estadoEl.className = 'value badge-status';
    
    if (troquel.estadoDepurado === 'En Mantenimiento') estadoEl.classList.add('status-mantenimiento');
    else if (troquel.estadoDepurado === 'Depurado') estadoEl.classList.add('status-depurado');
    else estadoEl.classList.add('status-activo');

    const galeria = document.getElementById('detGaleria');
    galeria.innerHTML = '';
    if (troquel.imagenes && troquel.imagenes.length > 0) {
        troquel.imagenes.forEach(img => {
            galeria.innerHTML += `<img src="${img}" alt="Imagen del troquel">`;
        });
    } else {
        galeria.innerHTML = '<p style="color: var(--text-light)">No hay imágenes registradas.</p>';
    }

    modalDetalle.classList.add('active');
}

function cerrarModalDetalle() {
    modalDetalle.classList.remove('active');
}

function exportarExcel() {
    const datosExportar = obtenerDatosFiltrados();
    if (datosExportar.length === 0) {
        alert('No hay datos en la lista actual para exportar.');
        return;
    }
    
    const datosExcel = datosExportar.map(t => ({
        Nombre: t.nombre,
        Referencia: t.referencia,
        Cliente: t.cliente,
        Ubicación: t.ubicacion,
        Cantidad: t.cantidad,
        Cavidades: t.cavidades,
        'Costo ($)': t.costo,
        Proveedor: t.proveedor,
        'Fecha Ingreso': t.fechaIngreso,
        Estado: t.estadoDepurado,
        'Fecha Depuración': t.fechaDepuracion
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    const tituloHoja = pestanaActual === 'activos' ? "Troqueles Activos" : "Troqueles Depurados";
    XLSX.utils.book_append_sheet(workbook, worksheet, tituloHoja);
    XLSX.writeFile(workbook, `Inventario_${tituloHoja.replace(' ', '_')}.xlsx`);
}

function exportarDetallePDF() {
    const elemento = document.getElementById('printDetalleArea');
    
    // Ocultar elementos no deseados para impresión
    const noPrint = elemento.querySelectorAll('.no-print-pdf');
    noPrint.forEach(el => el.style.display = 'none');

    const nombre = document.getElementById('detNombre').textContent;
    const opt = {
        margin:       10,
        filename:     `Hoja_Vida_${nombre}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(elemento).save().then(() => {
        // Restaurar elementos
        noPrint.forEach(el => el.style.display = '');
    });
}

function exportarListaPDF() {
    const datos = obtenerDatosFiltrados();
    if (datos.length === 0) {
        alert('No hay datos en la lista actual para exportar a PDF.');
        return;
    }

    const areaImprimir = document.getElementById('areaImprimirTabla');
    
    // Preparar UI para PDF (Mostrar título, ocultar columnas inútiles en papel)
    document.getElementById('printTitle').textContent = pestanaActual === 'activos' ? "Listado de Troqueles Activos" : "Listado de Troqueles Depurados";
    document.getElementById('printDate').textContent = new Date().toLocaleDateString();
    document.querySelector('.print-header').style.display = 'block';
    
    const ocultar = areaImprimir.querySelectorAll('.no-print');
    ocultar.forEach(el => el.style.display = 'none');

    const opt = {
        margin:       [10, 5, 10, 5],
        filename:     `Listado_${pestanaActual}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(areaImprimir).save().then(() => {
        // Restaurar UI
        document.querySelector('.print-header').style.display = 'none';
        ocultar.forEach(el => el.style.display = '');
    });
}

// Tema Oscuro / Claro
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
    if(theme === 'dark') {
        btnIcon.className = 'fa-solid fa-sun';
        document.getElementById('themeToggleBtn').style.color = '#fbbf24'; // amarillo
    } else {
        btnIcon.className = 'fa-solid fa-moon';
        document.getElementById('themeToggleBtn').style.color = 'var(--dark)';
    }
}
