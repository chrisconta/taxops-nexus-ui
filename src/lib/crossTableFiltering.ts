import { supabase } from "@/integrations/supabase/client";

// Define table relationships and field mappings
const TABLE_RELATIONSHIPS = {
  transactions: {
    // Fields that need to be mapped from the clients table
    clientFields: ['name', 'email', 'taxid', 'sat_status'],
    foreignKey: 'client_id',
    referencedTable: 'clients',
    referencedKey: 'id'
  }
  // Add more table relationships here as needed
};

export interface CrossTableFilter {
  sourceTable: string;
  column: string;
  value: string;
}

/**
 * Applies cross-table filtering logic to a Supabase query
 * @param query - The base Supabase query
 * @param targetTable - The table being queried
 * @param filter - The filter to apply
 * @returns Modified query with appropriate filtering
 */
export async function applyCrossTableFilter(
  query: any,
  targetTable: string,
  filter: CrossTableFilter
): Promise<any> {
  const { column, value } = filter;
  
  // Check if this table has cross-table relationships defined
  const relationship = TABLE_RELATIONSHIPS[targetTable as keyof typeof TABLE_RELATIONSHIPS];
  
  if (!relationship) {
    // No relationships defined, apply direct filtering
    return query.eq(column, value);
  }
  
  // Check if the column is a field that needs cross-table mapping
  if (relationship.clientFields.includes(column)) {
    // Look up the foreign key value from the referenced table
    const { data: referencedData, error: referencedError } = await supabase
      .from('clients' as any)
      .select('id')
      .eq(column, value)
      .single();

    if (referencedError) {
      throw new Error(`${column.charAt(0).toUpperCase() + column.slice(1)} not found: ${value}`);
    }

    if (referencedData && 'id' in referencedData) {
      // Apply filter using the foreign key
      return query.eq(relationship.foreignKey, referencedData.id);
    }

    // No matching record found, this will result in empty data
    return query.eq(relationship.foreignKey, 'no-match-found');
  } else {
    // Direct column filtering for fields that exist in the target table
    return query.eq(column, value);
  }
}

/**
 * Checks if a filter requires cross-table lookup for a given target table
 * @param targetTable - The table being queried
 * @param column - The column being filtered
 * @returns Whether cross-table lookup is needed
 */
export function requiresCrossTableLookup(targetTable: string, column: string): boolean {
  const relationship = TABLE_RELATIONSHIPS[targetTable as keyof typeof TABLE_RELATIONSHIPS];
  
  if (!relationship) {
    return false;
  }
  
  return relationship.clientFields.includes(column);
}

/**
 * Gets the appropriate error message for cross-table filtering errors
 * @param targetTable - The table being queried
 * @param column - The column being filtered
 * @param value - The filter value
 * @returns User-friendly error message
 */
export function getCrossTableErrorMessage(targetTable: string, column: string, value: string): string {
  const relationship = TABLE_RELATIONSHIPS[targetTable as keyof typeof TABLE_RELATIONSHIPS];
  
  if (relationship && relationship.clientFields.includes(column)) {
    return `No ${relationship.referencedTable.slice(0, -1)} found with ${column}: ${value}`;
  }
  
  return `Error filtering by ${column}: ${value}`;
}