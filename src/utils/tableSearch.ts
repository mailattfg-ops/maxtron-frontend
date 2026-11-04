/** The search rule of TableView, for anyone who must list exactly what a table shows (an export, say). */

type Field = string | number | symbol;

/** A row's field as lower-case text; 'customers.customer_name' reads a nested value. */
const fieldText = (item: any, field: Field) => {
    const value = String(field).split('.').reduce((acc: any, part) => acc && acc[part], item);
    return value === null || value === undefined ? '' : String(value).toLowerCase();
};

const searchWords = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean);

/** Every word typed must be found, in any field, so "1038 sreekrishna" finds a code and a name together. */
export function matchesSearch(item: any, query: string, fields: Field[]): boolean {
    return searchWords(query).every(word => fields.some(field => fieldText(item, field).includes(word)));
}

/** Lower is better: an earlier search field first, then the whole value, its start, anywhere in it. */
function wordRank(item: any, word: string, fields: Field[]) {
    const index = fields.findIndex(field => fieldText(item, field).includes(word));
    const text = fieldText(item, fields[index]);
    return index * 3 + (text === word ? 0 : text.startsWith(word) ? 1 : 2);
}

/** The rows that match, best fit first. With nothing typed, the rows keep their order. */
export function searchRows<T>(data: T[], query: string, fields: Field[]): T[] {
    const words = searchWords(query);
    return data
        .filter(item => matchesSearch(item, query, fields))
        .map(item => ({ item, rank: words.reduce((sum, word) => sum + wordRank(item, word, fields), 0) }))
        .sort((a, b) => a.rank - b.rank)
        .map(row => row.item);
}
