import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../style/lists.css';
import { Filesystem, Directory, Encoding, FileInfo } from '@capacitor/filesystem';

interface List {
    name: string;
    items: { text: string; checked: boolean }[];
}

const Lists: React.FC = () => {
    const [lists, setLists] = useState<List[]>([]);
    const [newListName, setNewListName] = useState('');
    const [selectedListIndex, setSelectedListIndex] = useState<number | null>(null);
    const [showNewListInput, setShowNewListInput] = useState(false);
    const newListInputRef = useRef<HTMLInputElement | null>(null); // Tillater null

    const saveListToFile = async (listName: string, items: { text: string; checked: boolean }[]) => {
        try {
            const directory = Directory.Data; // Konsistent katalog
            const result = await Filesystem.writeFile({
                path: `${listName}.json`,
                data: JSON.stringify(items),
                directory,
                encoding: Encoding.UTF8,
            });
            console.log(`List ${listName} saved successfully at: ${result.uri}`);
        } catch (error) {
            console.error(`Error saving list ${listName}:`, error);
        }
    };

    const loadListFromFile = async (listName: string) => {
        try {
            const result = await Filesystem.readFile({
                path: `${listName}.json`,
                directory: Directory.Data,
                encoding: Encoding.UTF8,
            });
            return JSON.parse(result.data as string); // Typekasting til string
        } catch (error) {
            console.error(`Error loading list ${listName}:`, error);
            return [];
        }
    };

    useEffect(() => {
        if (showNewListInput && newListInputRef.current) {
            newListInputRef.current.focus();
        }
    }, [showNewListInput]);

    useEffect(() => {
        const loadLists = async () => {
            try {
                const result = await Filesystem.readdir({
                    path: '',
                    directory: Directory.Data,
                });

                const loadedLists: List[] = [];

                for (const file of result.files) {
                    let fileName: string;

                    if (typeof file === 'string') {
                        fileName = file;
                    } else if ((file as FileInfo).name) {
                        fileName = (file as FileInfo).name;
                    } else {
                        continue;
                    }

                    if (fileName.endsWith('.json')) {
                        const listName = fileName.replace('.json', '');
                        const items = await loadListFromFile(listName);
                        loadedLists.push({ name: listName, items });
                    }
                }

                setLists(loadedLists);
                console.log('Loaded lists:', loadedLists);
            } catch (error) {
                console.error('Error reading directory:', error);
            }
        };

        loadLists();
    }, []);

    const addList = () => {
        if (newListName.trim()) {
            const newList = { name: newListName, items: [] };
            setLists([...lists, newList]);
            setSelectedListIndex(lists.length);
            saveListToFile(newList.name, newList.items);
            setNewListName('');
            setShowNewListInput(false);
            console.log(`Added new list: ${newList.name}`);
        }
    };

    const selectList = (index: number) => {
        setSelectedListIndex(index);
        console.log(`Selected list index set to: ${index}`);
    };

    const deleteList = async (index: number) => {
        const listName = lists[index].name;
        const updatedLists = lists.filter((_, i) => i !== index);
        setLists(updatedLists);
        console.log(`List ${listName} deleted. Updated lists:`, updatedLists);

        try {
            await Filesystem.deleteFile({
                path: `${listName}.json`,
                directory: Directory.Data,
            });
            console.log(`List ${listName} deleted successfully.`);
        } catch (error) {
            console.error(`Error deleting list ${listName}:`, error);
        }

        if (selectedListIndex === index) {
            setSelectedListIndex(null);
            console.log('Selected list index set to null');
        } else if (selectedListIndex !== null && selectedListIndex > index) {
            setSelectedListIndex(selectedListIndex - 1);
            console.log(`Selected list index adjusted to: ${selectedListIndex - 1}`);
        }
    };

    const addItemToList = useCallback((listIndex: number, newItemText: string) => {
        const updatedLists = lists.map((list, i) => {
            if (i === listIndex) {
                const updatedItems = [...list.items, { text: newItemText, checked: false }];
                saveListToFile(list.name, updatedItems);
                return { ...list, items: updatedItems };
            } else {
                return list;
            }
        });
        setLists(updatedLists);
        console.log(`Added item to list index ${listIndex}: ${newItemText}`);
    }, [lists]);

    const toggleItemInList = useCallback((listIndex: number, itemIndex: number) => {
        const updatedLists = lists.map((list, i) => {
            if (i === listIndex) {
                const updatedItems = list.items.map((item, j) => {
                    if (j === itemIndex) {
                        return { ...item, checked: !item.checked };
                    } else {
                        return item;
                    }
                });
                saveListToFile(list.name, updatedItems);
                return { ...list, items: updatedItems };
            } else {
                return list;
            }
        });
        setLists(updatedLists);
        console.log(`Toggled item ${itemIndex} in list index ${listIndex}`);
    }, [lists]);

    return (
        <div className="lists-container">
            <button onClick={() => setShowNewListInput(true)} className="add-list-button">
                New List
            </button>
            {showNewListInput && (
                <div className="input-group">
                    <input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="Enter list name"
                        className="input-field"
                        ref={newListInputRef} // Tillater null
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                addList();
                            }
                        }}
                    />
                    <button onClick={addList} className="confirm-button">
                        Confirm
                    </button>
                    <button onClick={() => setShowNewListInput(false)} className="cancel-button">
                        Cancel
                    </button>
                </div>
            )}
            <div className="list-names">
                {lists.map((list, index) => (
                    <div key={index} className="list-item">
                        <span
                            onClick={() => selectList(index)}
                            className={`list-name ${selectedListIndex === index ? 'selected-list' : ''}`}
                        >
                            {list.name}
                        </span>

                    </div>
                ))}
            </div>
            {selectedListIndex !== null && lists[selectedListIndex] && (
                <ListDetails
                    list={lists[selectedListIndex]}
                    listIndex={selectedListIndex}
                    addItemToList={addItemToList}
                    toggleItemInList={toggleItemInList}
                    deleteList={deleteList}
                />
            )}
        </div>
    );

};

interface ListDetailsProps {
    list: List;
    listIndex: number;
    addItemToList: (listIndex: number, newItemText: string) => void;
    toggleItemInList: (listIndex: number, itemIndex: number) => void;
    deleteList: (listIndex: number) => void;
}

const ListDetails: React.FC<ListDetailsProps> = ({
                                                     list,
                                                     listIndex,
                                                     addItemToList,
                                                     toggleItemInList,
                                                     deleteList, // Destructuring av deleteList
                                                 }) => {
    const [newItem, setNewItem] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null); // Tillater null

    useEffect(() => {
        inputRef.current?.focus();
    }, [listIndex]);

    const addItem = () => {
        if (newItem.trim()) {
            addItemToList(listIndex, newItem);
            setNewItem('');
            console.log(`Added new item to list ${list.name}: ${newItem}`);
        }
    };

    const toggleItem = (index: number) => {
        toggleItemInList(listIndex, index);
        console.log(`Toggled item ${index} in list ${list.name}`);
    };

    const handleDelete = () => {
        const confirmDelete = window.confirm(`Are you sure you want to delete the list "${list.name}"?`);
        if (confirmDelete) {
            deleteList(listIndex);
        }
    };


    const sortedItems = list.items
        .map((item, idx) => ({ ...item, originalIndex: idx }))
        .sort((a, b) => {
            if (a.checked === b.checked) return 0;
            return a.checked ? 1 : -1;
        });

    return (
        <div className="list-details">
            <button
                onClick={handleDelete}
                className="delete-list-button-details"
                title="Delete List"
            >
                &times;
            </button>
            <h2>{list.name}</h2>
            <div className="input-group">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Enter task"
                    className="input-field"
                    ref={inputRef}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            addItem();
                        }
                    }}
                />
                <button onClick={addItem} className="add-button">
                    Add Task
                </button>
            </div>
            <ul>
                {sortedItems.map((item) => (
                    <li key={item.originalIndex}>
                        <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleItem(item.originalIndex)}
                        />
                        {item.text}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Lists;
