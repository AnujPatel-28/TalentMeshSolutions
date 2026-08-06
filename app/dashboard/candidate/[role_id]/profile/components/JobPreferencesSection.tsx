import React from 'react';
import styles from '../../../../shared-dashboard.module.css';
import SectionStatus from './SectionStatus';
import type { CandidateProfile } from '@/types/user';
import { CustomSelect } from '@/components/ui/CustomSelect';

const SALARY_OPTIONS = [
  { label: 'Select expected salary', value: '' },
  { label: '₹10,000 / month', value: '10000' },
  { label: '₹20,000 / month', value: '20000' },
  { label: '₹30,000 / month', value: '30000' },
  { label: '₹40,000 / month', value: '40000' },
  { label: '₹50,000 / month', value: '50000' },
  { label: '₹60,000 / month', value: '60000' },
  { label: '₹70,000 / month', value: '70000' },
  { label: '₹80,000 / month', value: '80000' },
  { label: '₹90,000 / month', value: '90000' },
  { label: '₹1,00,000 / month', value: '100000' },
  { label: '₹1,20,000 / month', value: '120000' },
  { label: '₹1,50,000 / month', value: '150000' },
  { label: '₹2,00,000 / month', value: '200000' },
  { label: '₹2,50,000 / month', value: '250000' },
  { label: '₹3,00,000 / month', value: '300000' },
  { label: 'Custom amount...', value: 'custom' }
];

const INDIAN_LOCATIONS = [
  'Bengaluru, Karnataka',
  'Chennai, Tamil Nadu',
  'Delhi, NCT',
  'Hyderabad, Telangana',
  'Mumbai, Maharashtra',
  'Pune, Maharashtra',
  'Noida, Uttar Pradesh',
  'Gurgaon, Haryana',
  'Kolkata, West Bengal',
  'Ahmedabad, Gujarat',
  'Surat, Gujarat',
  'Vadodara, Gujarat',
  'Jaipur, Rajasthan',
  'Lucknow, Uttar Pradesh',
  'Indore, Madhya Pradesh',
  'Bhopal, Madhya Pradesh',
  'Patna, Bihar',
  'Ranchi, Jharkhand',
  'Bhubaneswar, Odisha',
  'Guwahati, Assam',
  'Chandigarh',
  'Kochi, Kerala',
  'Thiruvananthapuram, Kerala',
  'Coimbatore, Tamil Nadu',
  'Visakhapatnam, Andhra Pradesh',
  'Vijayawada, Andhra Pradesh',
  'Nagpur, Maharashtra',
  'Nashik, Maharashtra',
  // All States of India as options
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Andaman & Nicobar', 'Chandigarh UT', 'Dadra & Nagar Haveli', 
  'Daman & Diu', 'Delhi NCR', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

interface JobPreferencesSectionProps {
  preferredLocations?: string[] | null;
  jobTypes?: string[] | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  openToRemote?: boolean | null;
  isEditing: boolean;
  onUpdate: (fields: Partial<CandidateProfile>) => void;
}

export default React.memo(function JobPreferencesSection({
  preferredLocations = [],
  jobTypes = [],
  salaryMin,
  salaryMax,
  currency = 'INR',
  openToRemote = true,
  isEditing,
  onUpdate
}: JobPreferencesSectionProps) {
  
  const locations = preferredLocations || [];
  const types = jobTypes || [];
  const isComplete = locations.length > 0 && types.length > 0 && (!!salaryMin || !!salaryMax);

  const [isCustomMinActive, setIsCustomMinActive] = React.useState(
    salaryMin !== undefined && salaryMin !== null && 
    !SALARY_OPTIONS.some(opt => opt.value === String(salaryMin))
  );
  const [isCustomMaxActive, setIsCustomMaxActive] = React.useState(
    salaryMax !== undefined && salaryMax !== null && 
    !SALARY_OPTIONS.some(opt => opt.value === String(salaryMax))
  );

  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = React.useState(false);
  const [locationInput, setLocationInput] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLocations = React.useMemo(() => {
    const query = locationInput.toLowerCase().trim();
    if (!query) return INDIAN_LOCATIONS.filter(loc => !locations.includes(loc));
    return INDIAN_LOCATIONS.filter(loc => 
      loc.toLowerCase().includes(query) && !locations.includes(loc)
    );
  }, [locationInput, locations]);

  const addLocation = (loc: string) => {
    const clean = loc.trim();
    if (clean && !locations.includes(clean)) {
      onUpdate({ preferred_locations: [...locations, clean] });
    }
    setLocationInput('');
    setIsLocationDropdownOpen(false);
  };

  React.useEffect(() => {
    if (salaryMin !== undefined && salaryMin !== null) {
      const isPredefined = SALARY_OPTIONS.some(opt => opt.value === String(salaryMin));
      if (!isPredefined) setIsCustomMinActive(true);
    }
  }, [salaryMin]);

  React.useEffect(() => {
    if (salaryMax !== undefined && salaryMax !== null) {
      const isPredefined = SALARY_OPTIONS.some(opt => opt.value === String(salaryMax));
      if (!isPredefined) setIsCustomMaxActive(true);
    }
  }, [salaryMax]);

  const formattedSalary = React.useMemo(() => {
    if (!salaryMin && !salaryMax) return 'Not specified';
    const symbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency + ' ');
    const minStr = salaryMin ? salaryMin.toLocaleString('en-IN') : null;
    const maxStr = salaryMax ? salaryMax.toLocaleString('en-IN') : null;
    if (minStr && maxStr) return `${symbol}${minStr} – ${symbol}${maxStr}`;
    if (minStr) return `${symbol}${minStr}+`;
    return `${symbol}${maxStr} max`;
  }, [salaryMin, salaryMax, currency]);

  return (
    <div className={styles.profileSection}>
      <SectionStatus 
        title="Job Preferences" 
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-blue)' }}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>} 
        isComplete={isComplete} 
        required={true}
      />

      {isEditing ? (
        <div className={styles.editGrid}>
          {/* Preferred Locations Input */}
          <div className={styles.fieldFull} ref={dropdownRef} style={{ position: 'relative' }}>
            <label className={styles.formLabel}>Preferred Locations (Select from dropdown or type)</label>
            
            {/* Tag display bar */}
            <div className={styles.tagInput} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '38px', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', marginBottom: '8px' }}>
              {locations.map(loc => (
                <span key={loc} className={styles.skillChip} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1e40af', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                  {loc}
                  <button 
                    type="button" 
                    onClick={() => {
                      const updated = locations.filter(l => l !== loc);
                      onUpdate({ preferred_locations: updated });
                    }}
                    style={{ border: 'none', background: 'none', color: '#1e40af', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}
                    aria-label={`Remove ${loc}`}
                  >×</button>
                </span>
              ))}
              {locations.length === 0 && (
                <span style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center' }}>No locations selected</span>
              )}
            </div>

            {/* Input with rotating dropdown arrow */}
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                className={styles.formInput}
                style={{ paddingRight: '36px' }}
                placeholder="Search and select locations..."
                value={locationInput}
                onChange={(e) => {
                  setLocationInput(e.target.value);
                  setIsLocationDropdownOpen(true);
                }}
                onFocus={() => setIsLocationDropdownOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (locationInput.trim()) {
                      addLocation(locationInput);
                    }
                  }
                }}
              />
              <div 
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isLocationDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {/* Dropdown list */}
            {isLocationDropdownOpen && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 99,
                  maxHeight: '180px',
                  overflowY: 'auto',
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                  padding: '4px',
                  marginTop: '4px'
                }}
              >
                {filteredLocations.map(loc => (
                  <div
                    key={loc}
                    onClick={() => addLocation(loc)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#334155',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {loc}
                  </div>
                ))}
                {filteredLocations.length === 0 && (
                  <div style={{ padding: '12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                    No matching locations. Press Enter to add custom location.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Job Types Checkboxes */}
          <div className={styles.fieldFull}>
            <label className={styles.formLabel}>Job Types (Select all that apply)</label>
            <div className={styles.checkboxGroupWrap}>
              {['Full-time', 'Contract', 'Freelance', 'Internship', 'Remote', 'Hybrid', 'Onsite'].map(type => {
                const isChecked = types.includes(type);
                return (
                  <label key={type} className={styles.formCheckboxGroup}>
                    <input 
                      type="checkbox"
                      checked={!!isChecked}
                      onChange={(e) => {
                        const updated = e.target.checked 
                          ? [...types, type] 
                          : types.filter(t => t !== type);
                        onUpdate({ job_types: updated });
                      }}
                    />
                    {type}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Expected Salary range */}
          <div className={`${styles.formGrid2Col} ${styles.fieldFull}`}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Min Expected Salary (Monthly)</label>
              <CustomSelect
                placeholder="Select minimum salary"
                value={isCustomMinActive ? 'custom' : (salaryMin ? String(salaryMin) : '')}
                options={SALARY_OPTIONS}
                className={styles.formInput}
                onChange={(val: string) => {
                  if (val === 'custom') {
                    setIsCustomMinActive(true);
                  } else if (val === '') {
                    setIsCustomMinActive(false);
                    onUpdate({ salary_min: undefined });
                  } else {
                    setIsCustomMinActive(false);
                    onUpdate({ salary_min: parseInt(val) });
                  }
                }}
              />
              {isCustomMinActive && (
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="number"
                    className={styles.formInput}
                    placeholder="Enter custom minimum monthly salary"
                    value={salaryMin === undefined || salaryMin === null || isNaN(salaryMin) ? '' : salaryMin}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value) || 0;
                      onUpdate({ salary_min: val });
                    }}
                  />
                </div>
              )}
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Max Expected Salary (Monthly)</label>
              <CustomSelect
                placeholder="Select maximum salary"
                value={isCustomMaxActive ? 'custom' : (salaryMax ? String(salaryMax) : '')}
                options={SALARY_OPTIONS}
                className={styles.formInput}
                onChange={(val: string) => {
                  if (val === 'custom') {
                    setIsCustomMaxActive(true);
                  } else if (val === '') {
                    setIsCustomMaxActive(false);
                    onUpdate({ salary_max: undefined });
                  } else {
                    setIsCustomMaxActive(false);
                    onUpdate({ salary_max: parseInt(val) });
                  }
                }}
              />
              {isCustomMaxActive && (
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="number"
                    className={styles.formInput}
                    placeholder="Enter custom maximum monthly salary"
                    value={salaryMax === undefined || salaryMax === null || isNaN(salaryMax) ? '' : salaryMax}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value) || 0;
                      onUpdate({ salary_max: val });
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Open to Remote Checkbox */}
          <div className={styles.fieldFull}>
            <label className={styles.formCheckboxGroup}>
              <input 
                type="checkbox"
                checked={openToRemote ?? true}
                onChange={(e) => onUpdate({ open_to_remote: e.target.checked })}
              />
              <span>Open to Remote Preference (recruiters will see you are open to remote roles)</span>
            </label>
          </div>
        </div>
      ) : (
        <div className={styles.preferencesGrid}>
          <div>
            <span className={styles.preferenceLabel}>Preferred Locations</span>
            <div className={styles.preferenceBadgeGroup}>
              {locations.length > 0 ? (
                locations.map(loc => (
                  <span key={loc} className={styles.skillBadge}>{loc}</span>
                ))
              ) : (
                <span className={styles.emptySectionText}>Not specified</span>
              )}
            </div>
          </div>
          <div>
            <span className={styles.preferenceLabel}>Job Types</span>
            <div className={styles.preferenceBadgeGroup}>
              {types.length > 0 ? (
                types.map(type => (
                  <span key={type} className={styles.skillBadge} data-tier="strong">{type}</span>
                ))
              ) : (
                <span className={styles.emptySectionText}>Not specified</span>
              )}
            </div>
          </div>
          <div>
            <span className={styles.preferenceLabel}>Expected Salary</span>
            <strong className={styles.preferenceValueStrong}>{formattedSalary}</strong>
          </div>
          <div>
            <span className={styles.preferenceLabel}>Open to Remote</span>
            <span className={openToRemote ? styles.visibilityBadgeVisible : styles.visibilityBadgeHidden}>
              {openToRemote ? '✓ Yes, Open' : 'No'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
