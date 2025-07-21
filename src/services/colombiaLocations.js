// src/services/colombiaLocations.js
class ColombiaLocationsService {
  constructor() {
    // API pública de Colombia (datos de la DIAN/DANE)
    this.baseURL = 'https://api-colombia.com/api/v1';
    this.cache = {
      departments: null,
      cities: new Map() // Cache por departamento
    };
  }

  async request(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Colombia locations:', error);
      throw error;
    }
  }

  // Obtener todos los departamentos
  async getDepartments() {
    if (this.cache.departments) {
      return this.cache.departments;
    }

    try {
      const departments = await this.request('/Department');
      
      // Formatear y ordenar departamentos
      const formattedDepartments = departments
        .map(dept => ({
          id: dept.id,
          name: dept.name,
          code: dept.code || ''
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      this.cache.departments = formattedDepartments;
      return formattedDepartments;
    } catch (error) {
      console.error('Error loading departments:', error);
      // Fallback con departamentos principales
      return this.getFallbackDepartments();
    }
  }

  // Obtener ciudades por departamento
  async getCitiesByDepartment(departmentId) {
    if (this.cache.cities.has(departmentId)) {
      return this.cache.cities.get(departmentId);
    }

    try {
      const cities = await this.request(`/Department/${departmentId}/cities`);
      
      // Formatear y ordenar ciudades
      const formattedCities = cities
        .map(city => ({
          id: city.id,
          name: city.name,
          departmentId: city.departmentId || departmentId
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      this.cache.cities.set(departmentId, formattedCities);
      return formattedCities;
    } catch (error) {
      console.error(`Error loading cities for department ${departmentId}:`, error);
      // Fallback con ciudades principales del departamento
      return this.getFallbackCities(departmentId);
    }
  }

  // Buscar departamento por nombre
  async findDepartmentByName(departmentName) {
    const departments = await this.getDepartments();
    return departments.find(dept => 
      dept.name.toLowerCase() === departmentName.toLowerCase()
    );
  }

  // Buscar ciudad por nombre en un departamento específico
  async findCityByName(cityName, departmentId) {
    const cities = await this.getCitiesByDepartment(departmentId);
    return cities.find(city => 
      city.name.toLowerCase() === cityName.toLowerCase()
    );
  }

  // Departamentos de fallback (casos principales)
  getFallbackDepartments() {
    return [
      { id: 5, name: 'Antioquia', code: '05' },
      { id: 8, name: 'Atlántico', code: '08' },
      { id: 11, name: 'Bogotá D.C.', code: '11' },
      { id: 13, name: 'Bolívar', code: '13' },
      { id: 15, name: 'Boyacá', code: '15' },
      { id: 17, name: 'Caldas', code: '17' },
      { id: 18, name: 'Caquetá', code: '18' },
      { id: 19, name: 'Cauca', code: '19' },
      { id: 20, name: 'Cesar', code: '20' },
      { id: 23, name: 'Córdoba', code: '23' },
      { id: 25, name: 'Cundinamarca', code: '25' },
      { id: 27, name: 'Chocó', code: '27' },
      { id: 41, name: 'Huila', code: '41' },
      { id: 44, name: 'La Guajira', code: '44' },
      { id: 47, name: 'Magdalena', code: '47' },
      { id: 50, name: 'Meta', code: '50' },
      { id: 52, name: 'Nariño', code: '52' },
      { id: 54, name: 'Norte de Santander', code: '54' },
      { id: 63, name: 'Quindío', code: '63' },
      { id: 66, name: 'Risaralda', code: '66' },
      { id: 68, name: 'Santander', code: '68' },
      { id: 70, name: 'Sucre', code: '70' },
      { id: 73, name: 'Tolima', code: '73' },
      { id: 76, name: 'Valle del Cauca', code: '76' }
    ].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Ciudades de fallback por departamento
  getFallbackCities(departmentId) {
    const fallbackCities = {
      11: [ // Bogotá D.C.
        { id: 1101, name: 'Bogotá', departmentId: 11 }
      ],
      5: [ // Antioquia
        { id: 505, name: 'Medellín', departmentId: 5 },
        { id: 501, name: 'Bello', departmentId: 5 },
        { id: 502, name: 'Envigado', departmentId: 5 },
        { id: 503, name: 'Itagüí', departmentId: 5 }
      ],
      76: [ // Valle del Cauca
        { id: 7601, name: 'Cali', departmentId: 76 },
        { id: 7602, name: 'Palmira', departmentId: 76 },
        { id: 7603, name: 'Buenaventura', departmentId: 76 }
      ],
      8: [ // Atlántico
        { id: 801, name: 'Barranquilla', departmentId: 8 },
        { id: 802, name: 'Soledad', departmentId: 8 }
      ],
      68: [ // Santander
        { id: 6801, name: 'Bucaramanga', departmentId: 68 },
        { id: 6802, name: 'Floridablanca', departmentId: 68 }
      ]
    };

    return fallbackCities[departmentId] || [
      { id: `${departmentId}01`, name: 'Capital', departmentId }
    ];
  }

  // Limpiar cache (útil para debugging)
  clearCache() {
    this.cache.departments = null;
    this.cache.cities.clear();
  }
}

export const colombiaLocationsService = new ColombiaLocationsService();