import { describe, it, expect } from 'vitest';

// ApplyModal pulls in lib/insforge, which throws on import without these.
process.env.NEXT_PUBLIC_INSFORGE_URL ||= 'http://insforge.test';
process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||= 'test-anon-key';
const { parseEducation } = await import('@/components/candidate/ApplyModal');

// Guards the ApplyModal profile sync: candidate-profile's PUT replaces the education
// column wholesale, so entries past the first must survive the string shape too.
describe('parseEducation', () => {
    const rows = [{ id: 'a', degree: 'B.Tech' }, { id: 'b', degree: 'M.Tech' }];

    it('keeps every entry when education is an array', () => {
        expect(parseEducation(rows)).toEqual(rows);
    });

    it('keeps every entry when education is a JSON string', () => {
        expect(parseEducation(JSON.stringify(rows))).toEqual(rows);
    });

    it('wraps a single JSON object', () => {
        expect(parseEducation('{"degree":"BCA"}')).toEqual([{ degree: 'BCA' }]);
    });

    it('treats unparseable text as a bare degree', () => {
        expect(parseEducation('B.Com')).toEqual([{ degree: 'B.Com' }]);
    });

    it('returns empty for null/empty input', () => {
        expect(parseEducation(null)).toEqual([]);
        expect(parseEducation('')).toEqual([]);
    });
});
