import {Request, Response} from 'express';

import db from '../database/connection';
import ConvertHourToMinutes from '../Util/ConvertHourToMinutes';

interface ScheduleItem {
    week_day: number,
    from: string,
    to: string
}

export default class ClassesController {
    async index(request: Request, response: Response) {
        const week_day = request.query.week_day as string;
        const subject = request.query.subject as string;
        const time = request.query.time as string;

        if(!week_day || !subject || !time){
            return response.status(400).json({
                error: 'Missing filter to search classes.',
            })
        }

        const timeInMinutes = ConvertHourToMinutes(time);

        const classes = await db('classes')
            .whereExists(function(){
                this.select('class_schedule.*')
                .from('class_schedule')
                .whereRaw('`class_schedule`.`class_id` = `classes`.`id`')
                .whereRaw('`class_schedule`.`week_day` = ??', [Number(week_day)])
                .whereRaw('`class_schedule`.`from` <= ??', [timeInMinutes])
                .whereRaw('`class_schedule`.`to` >= ??', [timeInMinutes])
            })
            .where('classes.subject', '=', subject)
            .join('users', 'classes.user_id', '=', 'users.id')
            .select(['classes.*', 'users.*']);

        return response.json(classes);
    }
    async create(request: Request, response: Response) {
        const {
            name,
            avatar,
            whatsapp,
            bio,
            subject,
            cost,
            schedule
        } = request.body;

        const trx = await db.transaction();

        try{
            const insertedUsersIds = await trx('users').insert({
                name,
                avatar,
                whatsapp,
                bio
            });
        
            const user_Id = insertedUsersIds[0];
            const classesId = await trx('classes').insert({
                subject,
                cost,
                user_Id,
            });
        
            const class_Id = classesId[0];
            const classSchedule = schedule.map((scheduleItem: ScheduleItem) => {
                return {
                    class_Id,
                    week_day: scheduleItem.week_day,
                    from: ConvertHourToMinutes(scheduleItem.from),
                    to: ConvertHourToMinutes(scheduleItem.to),
                }
            })
            await trx('class_schedule').insert(classSchedule);
            await trx.commit();
        
            return response.status(201).send();
        } catch(error) {
            await trx.rollback();
            return response.status(400).json({
                error: 'Unexpected error while creating new class'
            })
        }
    }
}