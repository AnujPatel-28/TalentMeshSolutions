import React, { useState } from 'react';
import { User, Briefcase, Award, Clock, MapPin, Pencil, Check, X, Tag } from 'lucide-react';

interface ResumeReviewProps {
  data: {
    name: string;
    role: string;
    skills: string[];
    yearsExp: number | null;
    location: string;
  };
  onConfirm: (finalData: any) => void;
  onCancel: () => void;
}

const ResumeReview: React.FC<ResumeReviewProps> = ({ data, onConfirm, onCancel }) => {
  const [formData, setFormData] = useState(data);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>(null);

  const startEditing = (field: string, value: any) => {
    setEditingField(field);
    setTempValue(value);
  };

  const saveEdit = () => {
    if (editingField) {
      setFormData({ ...formData, [editingField]: tempValue });
      setEditingField(null);
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
  };

  const handleSkillAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tempValue.trim()) {
      e.preventDefault();
      if (!tempValue.split(',').some((s: string) => s.trim() === '')) {
         // handle comma separated
      }
      const newSkills = [...formData.skills, ...tempValue.split(',').map((s: string) => s.trim()).filter(Boolean)];
      setFormData({ ...formData, skills: [...new Set(newSkills)] });
      setEditingField(null);
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white">
        <h2 className="text-2xl font-bold italic">Review Parsed Details</h2>
        <p className="text-blue-100 mt-1 opacity-90">We've extracted these from your resume. Please verify if everything looks correct.</p>
      </div>

      <div className="p-8 space-y-6">
        {/* Full Name */}
        <div className="group relative border-b border-gray-50 pb-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Full Name</label>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User size={18} className="text-blue-500" />
              {editingField === 'name' ? (
                <input 
                  autoFocus
                  className="text-lg font-medium text-gray-800 border-b-2 border-blue-400 outline-none pr-10"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                />
              ) : (
                <span className="text-lg font-semibold text-gray-800">{formData.name}</span>
              )}
            </div>
            <button 
              onClick={() => editingField === 'name' ? saveEdit() : startEditing('name', formData.name)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              {editingField === 'name' ? <Check size={18} className="text-green-500" /> : <Pencil size={16} className="text-gray-300 group-hover:text-blue-500" />}
            </button>
          </div>
        </div>

        {/* Professional Role */}
        <div className="group relative border-b border-gray-50 pb-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Desired Role / Headline</label>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase size={18} className="text-blue-500" />
              {editingField === 'role' ? (
                <input 
                  autoFocus
                  className="text-lg font-medium text-gray-800 border-b-2 border-blue-400 outline-none"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                />
              ) : (
                <span className="text-lg font-medium text-gray-700">{formData.role || "Not specified"}</span>
              )}
            </div>
            <button 
              onClick={() => editingField === 'role' ? saveEdit() : startEditing('role', formData.role)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              {editingField === 'role' ? <Check size={18} className="text-green-500" /> : <Pencil size={16} className="text-gray-300 group-hover:text-blue-500" />}
            </button>
          </div>
        </div>

        {/* Experience & Location Row */}
        <div className="grid grid-cols-2 gap-8 py-2">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Experience (Years)</label>
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-blue-500" />
                  {editingField === 'yearsExp' ? (
                    <input 
                      type="number"
                      autoFocus
                      className="w-20 text-lg font-medium text-gray-800 border-b-2 border-blue-400 outline-none"
                      value={tempValue ?? ''}
                      onChange={(e) => setTempValue(Number(e.target.value))}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    />
                  ) : (
                    <span className="text-lg font-semibold text-gray-800">{formData.yearsExp ?? 0} Years</span>
                  )}
                </div>
                <button 
                  onClick={() => editingField === 'yearsExp' ? saveEdit() : startEditing('yearsExp', formData.yearsExp)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                   {editingField === 'yearsExp' ? <Check size={16} className="text-green-500" /> : <Pencil size={14} className="text-gray-300 group-hover:text-blue-500" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Current Location</label>
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-blue-500" />
                  {editingField === 'location' ? (
                    <input 
                      autoFocus
                      className="text-lg font-medium text-gray-800 border-b-2 border-blue-400 outline-none"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    />
                  ) : (
                    <span className="text-lg font-medium text-gray-700 truncate max-w-[150px]">{formData.location || "Remote"}</span>
                  )}
                </div>
                <button 
                  onClick={() => editingField === 'location' ? saveEdit() : startEditing('location', formData.location)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                   {editingField === 'location' ? <Check size={16} className="text-green-500" /> : <Pencil size={14} className="text-gray-300 group-hover:text-blue-500" />}
                </button>
              </div>
            </div>
        </div>

        {/* Skills Tag List */}
        <div className="bg-gray-50 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
              <Tag size={16} className="text-blue-500" />
              Technical Skills
            </h3>
            <button 
              onClick={() => startEditing('skills_add', '')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white px-3 py-1.5 rounded-full border border-blue-100 shadow-sm"
            >
              + Add Skill
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {formData.skills.map((skill) => (
              <span key={skill} className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 shadow-sm group/tag">
                {skill}
                <button onClick={() => removeSkill(skill)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                  <X size={12} />
                </button>
              </span>
            ))}
            {editingField === 'skills_add' && (
               <input 
                 autoFocus
                 placeholder="Type skill and press Enter"
                 className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-sm outline-none w-48 text-blue-700"
                 value={tempValue}
                 onBlur={cancelEdit}
                 onChange={(e) => setTempValue(e.target.value)}
                 onKeyDown={handleSkillAdd}
               />
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border-t border-gray-100 p-8 flex gap-4">
        <button 
          onClick={onCancel}
          className="flex-1 py-4 text-gray-500 font-bold hover:text-gray-700 transition-colors"
        >
          Nevermind
        </button>
        <button 
          onClick={() => onConfirm(formData)}
          className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
        >
          Confirm & Save Profile
        </button>
      </div>
    </div>
  );
};

export default ResumeReview;
